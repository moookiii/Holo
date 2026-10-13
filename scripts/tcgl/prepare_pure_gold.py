"""Reflection-only orientation statistics; never changes TCGL height or normal."""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parents[2]
for cid in ('bw11_114','bw11_115'):
 p=ROOT/'public/cards/pokemon/tcgl-bw'/cid
 raw=Image.open(p/'original-etch.png').convert('RGBA')
 src=np.asarray(raw.crop((145,0,878,1024)),np.float32)/255
 h=1-src[:,:,:3].mean(2)
 dx=cv2.Scharr(h,cv2.CV_32F,1,0,scale=1/32)
 dy=-cv2.Scharr(h,cv2.CV_32F,0,1,scale=1/32)
 # Average only second moments for optical direction. No smoothing of relief.
 xx,xy,yy=[cv2.GaussianBlur(a,(0,0),4) for a in (dx*dx,dx*dy,dy*dy)]
 x=xx-yy;y=2*xy
 coherence=np.sqrt(x*x+y*y)/(xx+yy+1e-8)
 a=.5*np.arctan2(y,x)
 confidence=np.clip((coherence-.20)/.60,0,1)*np.clip((xx+yy)/.004,0,1)*src[:,:,3]
 field=np.stack((.5+.5*np.cos(2*a),.5+.5*np.sin(2*a),np.full_like(a,1/3),confidence),2)
 field=cv2.resize(field,(1800,2475),interpolation=cv2.INTER_LINEAR)
 dest=p/'gold-direction.png';Image.fromarray(np.rint(np.clip(field,0,1)*255).astype(np.uint8),'RGBA').save(dest)
 evidence={'source':str((p/'original-etch.png').relative_to(ROOT)).replace('\\','/'),'sourceSha256':hashlib.sha256((p/'original-etch.png').read_bytes()).hexdigest(),'outputSha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'dimensions':[1800,2475],'uvBox':[145/1024,0,878/1024,1],'verticalFlip':False,'method':'Own exact etch Scharr dx,-drow; 4 native-pixel sigma Gaussian average of gradient SECOND MOMENTS only; RG encode unoriented principal axis as cos(2theta),sin(2theta); A encodes directional coherence and source alpha. Bilinear output resize. B is neutral spacing. Used for anisotropic reflection, not diffraction or relief.','normalChanged':False,'runtimeGeneration':False,'limitation':'Optical orientation inferred from own die. Physical angular width calibrated visually to supplied Japanese photograph, not measured.'}
 (p/'gold-direction-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')
 print(cid)
