from pathlib import Path
import json,hashlib
from PIL import Image
p=Path('scripts/gym-challenge/wrapper-sources.json');r=json.loads(p.read_text(encoding='utf8'))
for a,design in zip(r[:4],['blaine','sabrina','giovanni','koga']):
 im=Image.open(a['file']).convert('RGBA');b=im.getchannel('A').getbbox();im=im.crop(b);im.thumbnail((1000,1600),Image.Resampling.LANCZOS);dst=Path(f'public/packs/pokemon/gym2-{design}.png');im.save(dst);a.update(design=design,crop=b,output=str(dst),outputSha256=hashlib.sha256(dst.read_bytes()).hexdigest())
p.write_text(json.dumps(r,indent=2)+'\n',encoding='utf8')
