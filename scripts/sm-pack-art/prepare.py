"""Prepare measured English SM wrapper photos offline, preserving source print."""
from pathlib import Path
import argparse
import hashlib
import json
import cv2
import numpy as np
import requests
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
CONFIG = Path(__file__).with_name('sources.json')
RAW = ROOT / 'research/tcgl/sm-wrappers/paired'
REVIEW = ROOT / 'artifacts/sm-pack-art'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(row):
    source = ROOT / row['source']
    if not source.exists():
        response = requests.get(row['url'], timeout=(10, 30))
        response.raise_for_status()
        source.write_bytes(response.content)
    with Image.open(source) as image:
        image.load()
        pixels = np.array(image.convert('RGB'))
        size = list(image.size)
    points = np.array(row['quad'], dtype=np.float32)
    width = min(np.linalg.norm(points[1]-points[0]), np.linalg.norm(points[2]-points[3]))
    height = min(np.linalg.norm(points[3]-points[0]), np.linalg.norm(points[2]-points[1]))
    # The measured physical wrapper aspect removes photographic foreshortening.
    # Both output axes remain bounded by the shorter source edges: no upscaling.
    aspect = row.get('aspect', width / height)
    width = int(min(width, height * aspect))
    height = int(width / aspect)
    target = np.array([[0,0],[width-1,0],[width-1,height-1],[0,height-1]],np.float32)
    transform = cv2.getPerspectiveTransform(points,target)
    crop = cv2.warpPerspective(pixels,transform,(width,height),flags=cv2.INTER_LINEAR)
    mask = Image.new('L',(size[0]*2,size[1]*2))
    outline = row.get('outline',row['quad'])
    ImageDraw.Draw(mask).polygon([(x*2,y*2) for x,y in outline],fill=255)
    mask = mask.resize(tuple(size),Image.Resampling.LANCZOS)
    alpha = cv2.warpPerspective(np.array(mask),transform,(width,height),flags=cv2.INTER_LINEAR)
    if row.get('removeEdgeBackground') == 'white':
        # Only remove white connected to the exterior of a stock product image.
        # Enclosed white print stays intact.
        white = (np.min(crop, axis=2) >= 248).astype(np.uint8)
        count, labels = cv2.connectedComponents(white, connectivity=8)
        exterior = np.unique(np.concatenate((labels[0], labels[-1], labels[:, 0], labels[:, -1])))
        exterior = exterior[exterior != 0]
        alpha[np.isin(labels, exterior)] = 0
    bounds = Image.fromarray(alpha).getbbox()
    if bounds is None:
        raise ValueError(f"Empty wrapper: {row['output']}")
    left, top, right, bottom = bounds
    crop, alpha = crop[top:bottom, left:right], alpha[top:bottom, left:right]
    height, width = alpha.shape
    output = ROOT / row['output']
    Image.fromarray(np.dstack([crop,alpha])).save(output)
    overlay = Image.fromarray(pixels)
    ImageDraw.Draw(overlay).line([tuple(p) for p in outline]+[tuple(outline[0])],fill='#ff33a0',width=3)
    overlay.save(REVIEW/(output.stem+'-boundary.jpg'))
    return {**row,'sourceDimensions':size,'sourceSha256':sha(source),
            'dimensions':[width,height],'sha256':sha(output),
            'operations':'Measured physical wrapper rectification and antialiased PNG outline. No upscaling, generated print, sharpening or color changes.'}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--set')
    args=parser.parse_args()
    RAW.mkdir(parents=True,exist_ok=True)
    REVIEW.mkdir(parents=True,exist_ok=True)
    rows=json.loads(CONFIG.read_bytes())
    evidence_path=ROOT/'public/packs/pokemon/sm-paired-sources.json'
    evidence=json.loads(evidence_path.read_bytes()) if evidence_path.exists() else []
    active_outputs = {row['output'] for row in rows}
    evidence = [row for row in evidence if row['output'] in active_outputs]
    for row in rows:
        if args.set and row['setId'] != args.set: continue
        result=prepare(row)
        evidence=[r for r in evidence if r['output']!=row['output']]+[result]
        print(row['output'],result['dimensions'],flush=True)
    evidence_path.write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8')
    wrappers_path=ROOT/'public/packs/pokemon/sm-wrapper-sources.json'
    wrappers=json.loads(wrappers_path.read_bytes())
    for wrapper in wrappers:
        change=next((r for r in evidence if r['output']==wrapper['output']),None)
        if change:
            previous=wrapper.get('previousSource') or {k:wrapper.get(k) for k in ['url','source','sourceDimensions','sourceSha256','dimensions','sha256']}
            wrapper.update(change,previousSource=previous)
    wrappers_path.write_text(json.dumps(wrappers,indent=2)+'\n',encoding='utf-8')
    registry={}
    for row in wrappers:
        registry.setdefault(row['setId'],[]).append({'id':row['id'],'name':row['name'],
            'front':'/packs/pokemon/'+Path(row['output']).name+'?v='+row['sha256'][:12]})
    (ROOT/'src/pokemon/data/sm-wrappers.generated.ts').write_text(
        'import type { PokemonBooster } from "../types.ts";\nexport const smWrappers: Record<string,PokemonBooster[]> = '+json.dumps(registry)+';\n',encoding='utf-8')


if __name__=='__main__':
    main()
