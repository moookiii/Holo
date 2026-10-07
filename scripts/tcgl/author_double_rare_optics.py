"""Rasterize reference star optical data only. NEVER read/write cutout maps.

RG = local optical inclination, B = star reflectivity, A = 1. This is not
coverage, protection, color, relief, or a normal map. The renderer applies the
existing TCGL foil/protection composition after evaluating these optics.
"""
from pathlib import Path
import json, math, hashlib
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
record = json.loads((Path(__file__).with_name('double-rare-stars.json')).read_text())
W,H,S = 1200,1650,2
field = np.zeros((H,W,4),dtype=np.uint8)
field[:,:,:2] = 128
field[:,:,3] = 255
for cx,cy,r,rays in record['stars']:
    # Large four-point crosses and short secondary rays match the observed
    # cast-and-cure motif. Antialias offline, not with runtime random glitter.
    x0,y0 = max(0,int((cx-r-1)*2)),max(0,int((cy-r-1)*2))
    x1,y1 = min(W,int((cx+r+1)*2)+1),min(H,int((cy+r+1)*2)+1)
    patch = Image.new('L',((x1-x0)*S,(y1-y0)*S))
    pts=[]
    for i in range(rays*2):
        angle=i*math.pi/rays
        radius=r*(1 if i%2==0 else .24)
        if rays==8 and i%4==2: radius*=.73
        pts.append(((cx*2+math.cos(angle)*radius*2-x0)*S,(cy*2+math.sin(angle)*radius*2-y0)*S))
    ImageDraw.Draw(patch).polygon(pts,fill=255)
    shape=np.asarray(patch.resize((x1-x0,y1-y0),Image.Resampling.LANCZOS))
    yy,xx=np.mgrid[y0:y1,x0:x1]
    # Fixed shallow optical facets across each star. No surface relief and no
    # pseudo-random orientation: neighboring motifs follow the same foil sheet.
    a=np.arctan2(-(yy-cy*2),xx-cx*2)
    sx=.18*math.sin(cx/600*5+cy/825*3)+.08*np.cos(a*2)
    sy=.16*math.cos(cy/825*5-cx/600*2)+.08*np.sin(a*2)
    region=field[y0:y1,x0:x1]
    inside=shape>region[:,:,2]
    region[:,:,0][inside]=np.rint(np.clip(.5+sx,0,1)*255).astype('uint8')[inside]
    region[:,:,1][inside]=np.rint(np.clip(.5+sy,0,1)*255).astype('uint8')[inside]
    region[:,:,2]=np.maximum(region[:,:,2],shape)
out=ROOT/'public/materials/sv-double-rare-stars.png'
out.parent.mkdir(exist_ok=True,parents=True)
Image.fromarray(field).save(out)
print(json.dumps({'path':str(out.relative_to(ROOT)), 'dimensions':[W,H], 'stars':len(record['stars']), 'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}))
