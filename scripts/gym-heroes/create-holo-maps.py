"""User-authored Gym Heroes contours; solid lightning is never flood-filled.
Outputs are independent, antialiased PNG coverage/protection in clean-front UVs.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image,ImageFilter,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'public/cards/pokemon/gym-heroes';OUT=ASSETS/'maps';OUT.mkdir(exist_ok=True)
REVIEW=ROOT/'artifacts/gym-heroes';REVIEW.mkdir(exist_ok=True)
# Enclosed background regions, identified on the supplied marked-up fronts.
HOLES={1:[(340,221),(428,291)],4:[(390,175)],5:[(364,246)],7:[(349,357),(387,374),(362,385)],
 12:[(227,246),(259,388)],
 15:[(371,253),(424,281),(241,261),(194,299),(259,305),(349,302),(416,335),(174,357),(210,393),(380,380)],
 16:[(383,254),(413,284),(213,307),(392,333),(185,356),(209,391)],
 17:[(387,243),(262,250),(398,298),(211,315),(449,285),(354,298),(279,295),(169,302),(435,345),(154,363)],
 18:[(392,314),(360,265),(196,352),(346,389),(238,401),(362,410)],19:[(131,260),(381,356),(378,374),(224,422),(414,418)]}
SUBJECT_SEEDS={6:[(316,332),(226,168),(402,195),(101,386)],8:[(294,258),(253,248),(429,320)]}
tiles=[];audit=[]
for n in range(1,20):
 trace=np.array(Image.open(ROOT/f'scripts/gym-heroes/traces/{n}.webp').convert('RGB'))
 clean=np.array(Image.open(ASSETS/f'{n}.png').convert('RGB'))
 color=[255,0,0] if n==13 else [34,177,76]
 stroke=np.uint8((np.max(np.abs(trace.astype(int)-color),axis=2)<70)&(np.max(np.abs(trace.astype(int)-clean.astype(int)),axis=2)>20))*255
 stroke[:90]=0;stroke[465 if n>=15 else 425:]=0
 stroke=cv2.morphologyEx(stroke,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
 if n==6:cv2.line(stroke,(64,421),(535,421),255,3)
 _,labels=cv2.connectedComponents(255-stroke)
 if n in SUBJECT_SEEDS:
  # The marker pixels themselves are protection on lightning. Fill only
  # explicitly identified character interiors, not spaces bounded by bolts.
  body=stroke.copy()
  for x,y in SUBJECT_SEEDS[n]:
   label=labels[y,x];assert label>1,(n,x,y,'Open character boundary')
   body[labels==label]=255
 else:
  contours,_=cv2.findContours(stroke,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
  body=np.zeros_like(stroke);cv2.drawContours(body,[c for c in contours if cv2.contourArea(c)>15],-1,255,cv2.FILLED)
  for x,y in HOLES.get(n,[]):
   label=labels[y,x];assert label>1,(n,x,y,'Unclosed hole')
   body[labels==label]=0
 body=cv2.resize(body,(1200,1650),interpolation=cv2.INTER_NEAREST)
 # Center ordinary outline strokes; preserve the width of painted lightning.
 if n not in [6,8]:body=cv2.erode(body,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))
 body=np.array(Image.fromarray(body).filter(ImageFilter.GaussianBlur(.6)))
 vertices=[(56,190),(551,190),(551,459),(56,459)] if n>=15 else [(65,96),(535,96),(535,420),(65,420)]
 window=np.zeros_like(body);cv2.fillPoly(window,[np.array(vertices,np.int32)*2],255)
 if n in [2,3,4,5,7,8,9,10,14]:
  badge=[(65,96),(139,96),(128,113),(126,123),(114,126),(111,135),(99,132),(88,143),(79,134),(65,141)]
  cv2.fillPoly(window,[np.array(badge,np.int32)*2],0)
 protection=np.maximum(body,255-window)
 for kind,data in [('foil',window),('protection',protection)]:Image.fromarray(data).save(OUT/f'{n}-{kind}.png',optimize=True)
 eff=window.astype(float)/255*(1-protection.astype(float)/255)
 preview=np.array(Image.fromarray(clean).resize((1200,1650)),dtype=float)
 overlay=np.uint8(preview*(1-eff[...,None]*.38)+np.array([0,225,255])*eff[...,None]*.38)
 Image.fromarray(overlay).save(REVIEW/f'{n}-mask-review.png')
 tile=Image.fromarray(overlay).crop((95,170,1120,940 if n>=15 else 865)).resize((410,300));ImageDraw.Draw(tile).text((4,4),str(n),fill='white',stroke_width=2,stroke_fill='black');tiles.append(tile)
 audit.append({'number':n,'protectedPixels':int((body>127).sum()),'solidLightning':n in [6,8],'holes':HOLES.get(n,[])})
sheet=Image.new('RGB',(410*4,300*5))
for i,tile in enumerate(tiles):sheet.paste(tile,(i%4*410,i//4*300))
sheet.save(REVIEW/'masks-contact.png')
(ROOT/'scripts/gym-heroes/mask-audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf8')
