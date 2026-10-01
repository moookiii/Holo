from pathlib import Path
import json,hashlib
from PIL import Image
import cv2,numpy as np
root=Path('artifacts/gym-heroes/wrapper-originals');out=Path('public/packs/pokemon')
manifest=json.loads(Path('scripts/gym-heroes/wrapper-sources.json').read_text())
for a in manifest:
 if a.get('design'):
  im=Image.open(a['file']).convert('RGBA');bounds=im.getchannel('A').getbbox();im=im.crop(bounds);im.thumbnail((1000,1400),Image.Resampling.LANCZOS)
  path=out/f"gym1-{a['design']}.png";im.save(path);a['crop']=bounds;a['output']=path.as_posix();a['outputSha256']=hashlib.sha256(path.read_bytes()).hexdigest()
 elif a['file'].endswith('back.jpg'):
  im=Image.open(a['file']).convert('RGB');print('back',im.size)
  src=np.float32([[253,180],[953,158],[955,1442],[173,1445]])
  transform=cv2.getPerspectiveTransform(src,np.float32([[0,0],[679,0],[679,1199],[0,1199]]))
  result=cv2.warpPerspective(np.array(im),transform,(680,1200))
  path=out/'gym1-back.png';Image.fromarray(result).save(path);a['corners']=src.tolist();a['output']=path.as_posix();a['outputSha256']=hashlib.sha256(path.read_bytes()).hexdigest()
Path('scripts/gym-heroes/wrapper-sources.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
