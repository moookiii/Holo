"""Register physical-reference photos to unchanged TCGL printed masters.

SIFT proposes only a projective coordinate transform. Motif positions are entered
by hand after inspecting the registered photos. No feature/dot detection.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'research/evolutions'
line = (ROOT / 'src/pokemon/data/xy-tcgl.generated.ts').read_text(encoding='utf-8').splitlines()[3]
sets = json.loads(json.loads(line.split('JSON.parse(', 1)[1].removesuffix(');')))
cards = {c['id']: c for s in sets if s['id'] == 'xy12' for c in s['cards']}
refs = json.loads((OUT / 'references.json').read_text())
for r in refs:
    cid = r['cardId']
    master = ROOT / 'public/cards/pokemon/tcgl-xy' / cards[cid]['variantFronts']['holo']
    front = Image.open(master).convert('RGB').resize((600,825), Image.Resampling.LANCZOS)
    source = np.asarray(front)
    photo = cv2.cvtColor(cv2.imread(str(ROOT / r['file'])), cv2.COLOR_BGR2RGB)
    sift = cv2.SIFT_create(nfeatures=6000)
    # Printed rules/title anchor the transform; holo glare cannot drive it.
    anchors = np.full((825,600),255,np.uint8)
    anchors[120:460,35:565] = 0
    ka, da = sift.detectAndCompute(cv2.cvtColor(source,cv2.COLOR_RGB2GRAY),anchors)
    kb, db = sift.detectAndCompute(cv2.cvtColor(photo,cv2.COLOR_RGB2GRAY),None)
    matches = [a for a,b in cv2.BFMatcher().knnMatch(da,db,k=2) if a.distance < .70*b.distance]
    a = np.float32([ka[m.queryIdx].pt for m in matches])
    b = np.float32([kb[m.trainIdx].pt for m in matches])
    transform, accepted = cv2.findHomography(a,b,cv2.RANSAC,3)
    assert transform is not None and accepted.sum() >= 16, cid
    error = np.linalg.norm(cv2.perspectiveTransform(a[:,None,:],transform)[:,0,:]-b,axis=1)
    registered = Image.fromarray(cv2.warpPerspective(photo,np.linalg.inv(transform),(600,825)))
    folder = OUT / cid
    registered.save(folder / 'registered.png')
    front.save(folder / 'master.png')
    grid = registered.resize((1200,1650))
    draw = ImageDraw.Draw(grid)
    for x in range(50,551,50):
        draw.line((x*2,240,x*2,900),fill=(40,220,220),width=1)
        draw.text((x*2+3,242),str(x),fill='white')
    for y in range(150,451,25):
        draw.line((90,y*2,1110,y*2),fill=(40,220,220),width=1)
        draw.text((91,y*2+2),str(y),fill='white')
    grid.crop((75,235,1125,915)).save(folder / 'artwork-grid.png')
    r['registration'] = {'coordinateDimensions':[600,825], 'master':master.relative_to(ROOT).as_posix(),
                         'masterToPhoto':transform.tolist(), 'inliers':int(accepted.sum()),
                         'medianPhotoReprojectionError':float(np.median(error[accepted.ravel()==1])),
                         'method':'SIFT on printed title/rules; RANSAC projective registration, manually reviewed artwork alignment; no motif detection.'}
    print(cid, r['registration']['inliers'], round(r['registration']['medianPhotoReprojectionError'],3))
(OUT / 'references.json').write_text(json.dumps(refs,indent=2)+'\n')
