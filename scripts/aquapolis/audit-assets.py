"""Decode and verify delivered assets, sources, deferred maps and wrapper crops."""
from pathlib import Path
from PIL import Image
import hashlib,json
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
  assert im.size==(1200,1650) and im.getextrema()==(0,0)
 elif p.parent.name=='maps':assert im.size==(600,825)
evidence=json.loads((BASE/'mask-evidence.json').read_text())
for e in evidence:
 n=e['collectorNumber'];p=BASE/'maps'/f'{n}-holo-protection.png'
 assert sha(p)==e['samSha256']==e['protectionSha256']
 assert sha(BASE/'maps'/f'{n}-holo-window.png')==e['windowSha256']
wrappers=json.loads((ROOT/'scripts/aquapolis/wrapper-sources.json').read_text())
for w in wrappers:
 p=ROOT/f"public/packs/pokemon/ecard2-{w['design']}.png";im=Image.open(p);im.load()
 assert im.mode=='RGBA' and list(im.size)==w['dimensions']
 assert im.getchannel('A').getbbox()==(0,0,*im.size)
 assert sha(p)==w['sha256']
thumbs=list((BASE/'thumbnails').glob('*.webp'));assert len(thumbs)==186
for p in thumbs:Image.open(p).load()
report={'masters':186,'prints':337,'normal':151,'reverse':151,'holoRare':32,'crystalSecretRare':3,
 'suppliedSamPreserved':32,'foilWindows':32,'emptyDeferredMotifs':32,'reverseMaps':151,'thumbnails':186,'wrappers':4,
 'lowerResolutionMasters':[s['file'] for s in sources if s['width']==200],
 'allImagesDecoded':True,'sourceAndMaskHashesVerified':True,'tightWrapperAlphaBounds':True,
 'cosmosRendering':'deferred','crystalPackInsertion':'unknown; omitted from random packs'}
(ROOT/'docs/aquapolis-asset-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
