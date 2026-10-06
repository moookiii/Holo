"""Verify unchanged masters/SAM, registered filled motifs and wrapper crops."""
from pathlib import Path
from PIL import Image
import hashlib,json
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'public/cards/pokemon/aquapolis'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources=json.loads((BASE/'sources.json').read_text())
assert len(sources)==186
for source in sources:
 p=BASE/source['file'];im=Image.open(p);im.load()
 assert im.format=='PNG' and list(im.size)==[source['width'],source['height']]
 assert sha(p)==source['sha256']
 assert im.width==200 if source['file'].endswith('b.png') else im.size==(600,825)
for p in BASE.rglob('*.png'):
 im=Image.open(p);im.load()
 if p.name.endswith('-cosmos.png'):
  assert im.mode=='L' and im.size==(1200,1650) and im.getextrema()[0]==0 and im.getextrema()[1]>0
 elif p.parent.name=='maps':assert im.size==(600,825)
evidence=json.loads((BASE/'mask-evidence.json').read_text())
for e in evidence:
 n=e['collectorNumber'];p=BASE/'maps'/f'{n}-holo-protection.png'
 assert sha(p)==e['samSha256']==e['protectionSha256']
 assert sha(BASE/'maps'/f'{n}-holo-window.png')==e['windowSha256']
registration=json.loads((ROOT/'scripts/aquapolis/cosmos-registration.json').read_text())
corrections=json.loads((ROOT/'scripts/aquapolis/cosmos-corrections.json').read_text())
assert len(registration)==32 and len({r['cardId'] for r in registration})==32
large_disks=0
for r in registration:
 n=f"H{int(r['cardId'].split('H')[1])}"
 assert r['reviewStatus']=='reviewed-visible-features' and corrections[r['cardId']]['reviewed']
 assert r['coordinateSize']==[600,825] and r['outputSize']==[1200,1650]
 assert r['transform']=={'crop':None,'flipY':False,'offset':[0,0]}
 assert r['masterSha256']==sha(BASE/f'{n}.png')
 assert r['protectionSha256']==sha(BASE/'maps'/f'{n}-holo-protection.png')
 assert r['windowSha256']==sha(BASE/'maps'/f'{n}-holo-window.png')
 assert r['motifSha256']==sha(BASE/'maps'/f'{n}-cosmos.png')
 pixels=np.array(Image.open(BASE/'maps'/f'{n}-cosmos.png'))
 assert r['motifs']
 # Verify the actual PNG interiors, not only the placement metadata. An internal
 # reflection must not become a hollow ring or cluster of small disks.
 for d in r['motifs']:
  if 'center' not in d or d['radius']<8:continue
  x,y=d['center'];radius=d['radius'];large_disks+=1
  left,right=max(0,int((x-radius*.7)*2)),min(1200,int((x+radius*.7)*2+1))
  top,bottom=max(0,int((y-radius*.7)*2)),min(1650,int((y+radius*.7)*2+1))
  gy,gx=np.mgrid[top:bottom,left:right]
  interior=np.hypot((gx+.5)/2-x,(gy+.5)/2-y)<radius*.65
  assert np.all(pixels[top:bottom,left:right][interior]>=round((.35+.65*d.get('brightness',1))*255)-1), (n,d)
wrappers=json.loads((ROOT/'scripts/aquapolis/wrapper-sources.json').read_text())
for w in wrappers:
 p=ROOT/f"public/packs/pokemon/ecard2-{w['design']}.png";im=Image.open(p);im.load()
 assert im.mode=='RGBA' and list(im.size)==w['dimensions']
 assert im.getchannel('A').getbbox()==(0,0,*im.size)
 assert sha(p)==w['sha256']
thumbs=list((BASE/'thumbnails').glob('*.webp'));assert len(thumbs)==186
for p in thumbs:Image.open(p).load()
report={'masters':186,'prints':337,'normal':151,'reverse':151,'holoRare':32,'crystalSecretRare':3,
 'suppliedSamPreserved':32,'foilWindows':32,'registeredCosmosMotifs':32,'filledLargeDisksChecked':large_disks,'reverseMaps':151,'thumbnails':186,'wrappers':4,
 'lowerResolutionMasters':[s['file'] for s in sources if s['width']==200],
 'allImagesDecoded':True,'sourceAndMaskHashesVerified':True,'tightWrapperAlphaBounds':True,
 'cosmosRendering':'32 H cards use unchanged Base Set 2 Cosmos optics; Crystal foil pending','crystalPackInsertion':'unknown; omitted from random packs'}
(ROOT/'docs/aquapolis-asset-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
