"""Validate lineage, stable regeneration and continuous motif interiors offline."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[2]
base = root/'public/cards/pokemon/expedition'
data = root/'scripts/expedition'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
rows = json.loads((data/'cosmos-registration.json').read_text())
originals = {r['cardId']: r for r in json.loads((base/'mask-evidence.json').read_text())}
corrections = json.loads((data/'cosmos-corrections.json').read_text())
assert len(rows) == 32
report = []
for n, row in enumerate(rows, 1):
    card_id = f'ecard1-{n}'
    assert row['cardId'] == card_id
    assert row['coordinateSize'] == [600,825]
    assert row['transform'] == {'crop':None,'flipY':False,'offset':[0,0]}
    assert row['reviewStatus'] == 'reviewed-visible-features'
    for key, path in [('masterSha256',base/f'{n}.png'),
                      ('protectionSha256',base/f'maps/{n}-holo-protection.png'),
                      ('windowSha256',base/f'maps/{n}-holo-window.png')]:
        assert sha(path) == row[key] == originals[card_id][key], (card_id,key)
    im = Image.open(base/f'maps/{n}-cosmos.png')
    assert im.mode == 'L' and im.size == (1200,1650)
    assert sha(base/f'maps/{n}-cosmos.png') == row['motifSha256']
    mask = np.array(im)
    checked = 0
    for motif in row['motifs']:
        pixels = mask
        if 'center' not in motif:
            polygon = np.array(motif['outline'],np.float32)*2
            region = np.zeros_like(mask); cv2.fillPoly(region,[polygon.astype(int)],255)
            # Stay inside the AA boundary; an observed star also has no holes.
            interior = cv2.erode(region,np.ones((5,5),np.uint8)) > 0
        else:
            x,y = motif['center']; rx,ry = motif.get('radii',[motif['radius']]*2)
            r = max(rx,ry)+1
            left,right = max(0,int((x-r)*2)),min(1200,int((x+r)*2+1))
            top,bottom = max(0,int((y-r)*2)),min(1650,int((y+r)*2+1))
            yy,xx = np.mgrid[top:bottom,left:right]
            pixels = mask[top:bottom,left:right]
            angle = np.deg2rad(motif.get('angle',0))
            dx,dy = (xx+.5)/2-x,(yy+.5)/2-y
            u,v = dx*np.cos(angle)+dy*np.sin(angle),-dx*np.sin(angle)+dy*np.cos(angle)
            interior = np.hypot(u/rx,v/ry) < .80
        assert interior.any()
        expected = round(255*(.35+.65*motif.get('brightness',1)))
        # Supersampled polygon tips retain slight Lanczos ringing near concave
        # corners. This tolerance permits that AA, but no holes or fragments.
        tolerance = 8 if 'outline' in motif else 1
        assert np.all(pixels[interior] >= expected-tolerance), (card_id,motif)
        checked += 1
    assert all(add in row['motifs'] for add in corrections[card_id]['add'])
    report.append({'cardId':card_id,'filledFeaturesChecked':checked,'motifSha256':row['motifSha256'],
                   'masterAndSamUnchanged':True})
before = {p:sha(p) for p in (base/'maps').glob('*-cosmos.png')}
subprocess.run([sys.executable,str(data/'register-cosmos.py')],cwd=root,check=True)
assert all(sha(p)==digest for p,digest in before.items()), 'Saved registration must regenerate identical PNGs'
out = root/'artifacts/expedition/cosmos-audit.json'
out.write_text(json.dumps({'cards':report,'stableRegeneration':True},indent=2)+'\n')
print('PASS: 32 masters/SAM/window hashes; all filled interiors; byte-identical offline regeneration.')
