"""Propose native-resolution SM wrapper upgrades from actual sourced imagery.

Feature matching is registration evidence, not permission to fabricate artwork.
Every resulting full wrapper crop remains available for individual visual review.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
import hashlib
import json
import re
import io
import requests
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'research/tcgl/sm-wrappers/highres'
cv2.setNumThreads(1)


def original_url(url):
    url = url.rstrip('#')
    if 'shopify.com' in url or '/cdn/shop/' in url:
        u = urlparse(url)
        path = re.sub(r'_\d+x\d*(?:@2x)?(?=\.[a-z]+$)', '', u.path)
        query = urlencode([(k,v) for k,v in parse_qsl(u.query) if k not in ('width','height','crop')])
        return urlunparse(u._replace(path=path, query=query, fragment=''))
    return url


def download(c):
    url = original_url(c['url'])
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    path = RAW / (key + '.source')
    try:
        if not path.exists():
            response = requests.get(url, timeout=(10, 25))
            if response.status_code == 404 and url != c['url'].rstrip('#'):
                url = c['url'].rstrip('#')
                response = requests.get(url, timeout=(10,25))
            response.raise_for_status()
            path.write_bytes(response.content)
        with Image.open(path) as image:
            image.load()
            if image.width > 16000 or image.height > 16000: raise ValueError('Oversized source')
            size = list(image.size)
        return {**c, 'url':url, 'file':path.relative_to(ROOT).as_posix(), 'dimensions':size,
                'sha256':hashlib.sha256(path.read_bytes()).hexdigest(), 'status':'decoded-original'}
    except Exception as error:
        return {**c, 'url':url, 'status':'unavailable', 'error':str(error)}


def proposal(reference, source, detector):
    native = np.array(source.convert('RGB'))
    scale = min(1, 1800 / max(source.size))
    small = cv2.resize(native, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA) if scale < 1 else native
    target_gray = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
    tk, td = detector.detectAndCompute(target_gray, None)
    ref = np.array(reference.convert('RGBA'))
    rk, rd = detector.detectAndCompute(cv2.cvtColor(ref[..., :3], cv2.COLOR_RGB2GRAY), ref[..., 3])
    if rd is None or td is None: return None
    pairs = cv2.BFMatcher().knnMatch(rd, td, k=2)
    good = [a for pair in pairs if len(pair)==2 for a,b in [pair] if a.distance < .74*b.distance]
    if len(good) < 18: return None
    rp = np.float32([rk[m.queryIdx].pt for m in good])
    tp = np.float32([tk[m.trainIdx].pt for m in good])
    transform, mask = cv2.findHomography(rp, tp, cv2.RANSAC, 3)
    if transform is None: return None
    inliers = rp[mask.ravel().astype(bool)]
    if len(inliers) < 16: return None
    rw,rh = reference.size
    center = ((inliers[:,0] > rw*.1)&(inliers[:,0] < rw*.9)&(inliers[:,1] > rh*.27)&(inliers[:,1] < rh*.72)).sum()
    if center < 6 or inliers[:,1].min()>rh*.18 or inliers[:,1].max()<rh*.87: return None
    corners = cv2.perspectiveTransform(np.float32([[[0,0],[rw-1,0],[rw-1,rh-1],[0,rh-1]]]),transform)[0]/scale
    sw,sh = source.size
    if np.any(corners[:,0]<0) or np.any(corners[:,1]<0) or np.any(corners[:,0]>=sw) or np.any(corners[:,1]>=sh): return None
    width = int(min(np.linalg.norm(corners[1]-corners[0]), np.linalg.norm(corners[2]-corners[3])))
    height = int(min(np.linalg.norm(corners[3]-corners[0]), np.linalg.norm(corners[2]-corners[1])))
    if height < 900 or width < 450 or abs(width/height-rw/rh) > .1: return None
    target = np.float32([[0,0],[width-1,0],[width-1,height-1],[0,height-1]])
    rectify = cv2.getPerspectiveTransform(corners.astype('float32'), target)
    crop = cv2.warpPerspective(native, rectify, (width,height), flags=cv2.INTER_LINEAR)
    alpha = cv2.resize(ref[...,3],(width,height),interpolation=cv2.INTER_LINEAR)
    output = Image.fromarray(np.dstack([crop,alpha]))
    # Save registration evidence, including full native coordinate quadrilateral.
    return output, {'sourceQuad':corners.tolist(), 'inliers':len(inliers), 'centerInliers':int(center),
                    'nativeHeight':height, 'nativeWidth':width, 'detectionScale':scale,
                    'operations':'Native-pixel perspective rectification of original wrapper photo. No upscaling, redraw or invented artwork.'}


def main():
    RAW.mkdir(exist_ok=True)
    candidates = json.loads((RAW.parent / 'highres-candidates.json').read_bytes())
    unique = {(c['setId'],original_url(c['url'])):c for c in candidates}
    records=[]
    with ThreadPoolExecutor(max_workers=6) as pool:
        jobs=[pool.submit(download,c) for c in unique.values()]
        for i,f in enumerate(as_completed(jobs),1):
            records.append(f.result())
            if i%20==0: print('Downloaded/checked',i,'/',len(jobs),'candidate originals',flush=True)
    (RAW / 'source-inventory.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
    wrappers = json.loads((ROOT / 'public/packs/pokemon/sm-wrapper-sources.json').read_bytes())
    detector = cv2.SIFT_create(nfeatures=4500)
    upgraded=[]
    for wrapper in wrappers:
        target = ROOT / wrapper['output']
        with Image.open(target) as image: reference=image.copy()
        best=None
        for source in records:
            if source['setId']!=wrapper['setId'] or source['status']!='decoded-original' or source['dimensions'][1]<900: continue
            with Image.open(ROOT/source['file']) as image:
                p=proposal(reference,image,detector)
            if p is not None and (best is None or p[1]['nativeHeight']>best[1]['nativeHeight']): best=(p[0],p[1],source)
        if best:
            image, evidence, source=best
            image.save(target)
            wrapper['originalArchiveSource']={k:wrapper[k] for k in ['url','source','sourceDimensions','sourceSha256','crop']}
            wrapper.update(url=source['url'],source=source['file'],sourceDimensions=source['dimensions'],sourceSha256=source['sha256'],
                           registration=evidence,dimensions=list(image.size),sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
                           reviewStatus='registration-proposal; inspect complete native crop')
            upgraded.append(wrapper['setId']+':'+wrapper['id'])
        print(wrapper['setId'],wrapper['id'],wrapper['dimensions'],'upgraded' if best else 'source-limited',flush=True)
    (ROOT/'public/packs/pokemon/sm-wrapper-sources.json').write_text(json.dumps(wrappers,indent=2)+'\n',encoding='utf-8')
    registry={}
    for r in wrappers:
        registry.setdefault(r['setId'],[]).append({'id':r['id'],'name':r['name'],'front':'/packs/pokemon/'+Path(r['output']).name+'?v='+r['sha256'][:12]})
    (ROOT/'src/pokemon/data/sm-wrappers.generated.ts').write_text('import type { PokemonBooster } from "../types.ts";\nexport const smWrappers: Record<string,PokemonBooster[]> = '+json.dumps(registry)+';\n',encoding='utf-8')
    report={'upgraded':upgraded,'belowTarget':[{'setId':r['setId'],'id':r['id'],'dimensions':r['dimensions']} for r in wrappers if r['dimensions'][1]<900]}
    (RAW/'upgrade-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('Upgraded',len(upgraded),'of',len(wrappers),'wrappers.',flush=True)


if __name__=='__main__':main()
