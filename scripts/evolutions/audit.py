"""Verify output independently of the runtime optical generators."""
from pathlib import Path
import json
import hashlib
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/cards/pokemon/evolutions-holo'
DATA=json.loads((Path(__file__).parent/'placements.json').read_text())
checks=[]
yy,xx=np.mgrid[:1650,:1200]
for cid,card in DATA['cards'].items():
    folder=OUT/cid
    e=json.loads((folder/'evidence.json').read_text())
    foil=np.asarray(Image.open(folder/'foil.png'),dtype=np.int16)
    stars=np.asarray(Image.open(folder/'star-foil.png'),dtype=np.int16)
    window=np.asarray(Image.open(folder/'window.png'))
    assert np.all(foil[window==0]==0),cid
    assert np.all(stars<=foil),cid
    assert np.all(stars[foil==0]==0),cid
    assert np.count_nonzero(stars)>0,cid
    dots=np.asarray(Image.open(folder/'dots.png'))
    for x,y,r in card['dots']:
        core=((xx+.5)/2-x)**2+((yy+.5)/2-y)**2 < (r*.60)**2
        assert np.min(dots[core])>=240,(cid,x,y)
    for key,path in e['maps'].items():
        assert hashlib.sha256((ROOT/'public'/path.lstrip('/')).read_bytes()).hexdigest()==e['hashes'][key]
    source=Image.open(ROOT/f'public/cards/pokemon/tcgl-xy/xy12_{cid.split("-")[1]}/original-foil.png').convert('RGBA')
    w,h=source.size
    expected=np.asarray(source.resize((1200,1650),Image.Resampling.BILINEAR,box=(145/1024*w,0,878/1024*w,h)))
    assert np.array_equal(expected,np.asarray(Image.open(folder/'foil-controls.png'))),cid
    checks.append({'cardId':cid,'dots':len(card['dots']),'stars':len(card['stars']),
                   'filledDisks':True,'outsideArtworkZero':True,'secondaryWithinOwnPlate':True,'nativePlatePreserved':True})
(ROOT/'artifacts/evolutions').mkdir(parents=True,exist_ok=True)
(ROOT/'artifacts/evolutions/asset-audit.json').write_text(json.dumps(checks,indent=2)+'\n')
print(f'Passed source, coverage, hashes and filled-disk checks for {len(checks)} printings.')
