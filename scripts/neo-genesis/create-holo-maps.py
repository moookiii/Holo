"""Rasterize user Neo Genesis outlines and separate Basic/Evolved foil windows.
All coordinates are the original 600 x 825 TCGdex print coordinates.
Lugia retains the existing authored treatment and is deliberately excluded.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'public/cards/pokemon/neo-genesis'
TRACES=ROOT/'scripts/neo-genesis/traces'
OUT=ASSETS/'maps'; OUT.mkdir(exist_ok=True)
REVIEW=ROOT/'artifacts/neo-genesis'; REVIEW.mkdir(parents=True,exist_ok=True)
# Enclosed background gaps within the supplied character outlines.
HOLES={8:[(161,163),(265,266)],13:[(346,263)]}
tiles=[]; audit=[]
for n in range(1,20):
 if n==9: continue
 trace=np.array(Image.open(TRACES/f'{n}.webp').convert('RGB')).astype(int)
 clean=np.array(Image.open(ASSETS/f'{n}.png').convert('RGB'))
 color=[90,245,25] if n in [4,5,13] else [34,177,76] if n==19 else [255,0,0]
 stroke=np.uint8(np.max(np.abs(trace-color),axis=2)<65)*255
 stroke[:90]=0;stroke[600 if n==19 else 428:]=0
 stroke=cv2.dilate(stroke,np.ones((3,3),np.uint8))
 stroke=cv2.morphologyEx(stroke,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
 contours,_=cv2.findContours(stroke,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 body=np.zeros_like(stroke)
 cv2.drawContours(body,[c for c in contours if cv2.contourArea(c)>100],-1,255,cv2.FILLED)
 _,labels=cv2.connectedComponents(255-stroke)
 for x,y in HOLES.get(n,[]):
  label=labels[y,x]; assert label>1,(n,x,y,'Open gap')
  body[labels==label]=0
 body=cv2.resize(body,(1200,1650),interpolation=cv2.INTER_NEAREST)
 body=cv2.erode(body,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
 body=np.array(Image.fromarray(body).filter(ImageFilter.GaussianBlur(.6)))
 if n==19:
  window=np.zeros_like(body);window[119*2:599*2,24*2:576*2]=255
 else:
  kind='basic' if n in [6,12,13] else 'evolved'
  window=np.array(Image.open(TRACES/f'{kind}-window.webp').convert('L').resize((1200,1650),Image.Resampling.LANCZOS))
 protection=np.maximum(body,255-window)
 for kind,data in [('foil',window),('protection',protection)]:Image.fromarray(data).save(OUT/f'{n}-{kind}.png',optimize=True)
 eff=window.astype(float)/255*(1-protection.astype(float)/255)
 preview=np.array(Image.fromarray(clean).resize((1200,1650)),dtype=float)
 overlay=np.uint8(preview*(1-eff[...,None]*.4)+np.array([0,225,255])*eff[...,None]*.4)
 Image.fromarray(overlay).save(REVIEW/f'{n}-mask-review.png')
 tile=Image.fromarray(overlay).resize((300,413));ImageDraw.Draw(tile).text((10,10),str(n),fill='white',stroke_width=2,stroke_fill='black');tiles.append(tile)
 audit.append({'number':n,'protectedPixels':int((body>127).sum()),'holes':HOLES.get(n,[])})
sheet=Image.new('RGB',(1800,1239))
for i,tile in enumerate(tiles):sheet.paste(tile,(i%6*300,i//6*413))
sheet.save(REVIEW/'masks-contact.png')
(ROOT/'scripts/neo-genesis/mask-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
