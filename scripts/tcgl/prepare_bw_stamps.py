"""Activate only the three exact English Worlds stamps; preserve other work."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw
from prepare_swsh_proofs import registered

ROOT = Path(__file__).resolve().parents[2]
IDS = ('bwbsp_28', 'bwbsp_50', 'bwbsp_95')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p, v): p.write_text(json.dumps(v, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

def main():
    review = ROOT/'artifacts/bw-stamps'; review.mkdir(parents=True, exist_ok=True)
    updates = {}
    for cid in IDS:
        folder = ROOT/'public/cards/pokemon/tcgl-bw'/cid
        e = json.loads((folder/'evidence.json').read_bytes())
        assert e['printing']['foil_effect'] == 'Stamped'
        assert e['printing']['assets']['etch']['status'] == 'not_applicable'
        for kind in ('front', 'foil'):
            assert sha(folder/f'original-{kind}.png') == e['sources'][kind]['sha256']
        controls = registered(Image.open(folder/'original-foil.png'), (733,1024))
        controls.save(folder/'foil-controls.png')
        mask = controls.convert('L'); mask.save(folder/'foil.png')
        rough = ROOT/'public/cards/pokemon/tcgl-bw/shared/smooth-roughness.png'
        if not rough.exists(): Image.new('L',(1,1),round(.30*255)).save(rough)
        maps = {k:'/'+p.relative_to(ROOT/'public').as_posix() for k,p in
                [('foil',folder/'foil.png'),('foilControls',folder/'foil-controls.png'),('roughness',rough)]}
        e.update(profile='bw-stamped', maps=maps, treatmentStatus='existing-material', deferredEffect=None,
                 normalGeneration=False, shaderChanges=False,
                 limitations='Exact TCGL stamp geometry. Smooth rainbow response follows the original Rainbow material. Physical angular intensity remains uncalibrated against an angled exact-card capture.')
        e['stampReview'] = dict(sourceVariant=e['tcglVariantId'], sourceDimensions=[1024,1024],
            outputDimensions=[733,1024], unityUvBox=[145/1024,0,878/1024,1], verticalFlip=False,
            method='Own continuous whiteplate, bilinear full-card registration; no threshold or morphology. No normal or height map.',
            hashes={k:sha(ROOT/'public'/v.lstrip('/')) for k,v in maps.items()},
            review='artifacts/bw-stamps', physicalAngularCalibration='pending')
        write(folder/'evidence.json',e)
        front=registered(Image.open(folder/'original-front.png'),(733,1024)).convert('RGB')
        overlay=Image.composite(Image.new('RGB',front.size,'#ff2688'),front,mask)
        overlay.save(review/f'{cid}-overlay.png');mask.save(review/f'{cid}-mask.png')
        front.save(review/f'{cid}-front.png')
        updates[cid.replace('_','-',1)] = maps
    p=ROOT/'src/pokemon/data/bw-tcgl.generated.ts'
    lines=p.read_text(encoding='utf8').splitlines()
    for i,l in enumerate(lines):
        if 'tcglBwSurfaces' not in l or 'JSON.parse(' not in l: continue
        prefix,encoded=l.split('JSON.parse(',1)
        surfaces=json.loads(json.loads(encoded.removesuffix(');')))
        for s in surfaces:
            if s['cardId'] in updates:
                s.update(profile='bw-stamped',maps=updates[s['cardId']],treatmentStatus='existing-material',deferredEffect=None)
        lines[i]=prefix+'JSON.parse('+json.dumps(json.dumps(surfaces,ensure_ascii=False))+');'
    p.write_text('\n'.join(lines)+'\n',encoding='utf8')
    p=ROOT/'docs/bw-pending-finishes.json'
    pending=json.loads(p.read_bytes()); pending.pop('Stamped promotional foil physical response',None);write(p,pending)

if __name__ == '__main__': main()
