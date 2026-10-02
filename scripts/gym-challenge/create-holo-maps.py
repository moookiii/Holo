"""User-authored Gym Challenge contours; solid lightning is never flood-filled.
Outputs are independent, antialiased PNG coverage/protection in clean-front UVs.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image,ImageFilter,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'public/cards/pokemon/gym-challenge';OUT=ASSETS/'maps';OUT.mkdir(exist_ok=True)
REVIEW=ROOT/'artifacts/gym-challenge';REVIEW.mkdir(exist_ok=True)
# Enclosed background regions, identified on the supplied marked-up fronts.
HOLES={2: [[121, 214], [325, 303], [141, 274]], 3: [[243, 214], [348, 300], [397, 327], [411, 370]], 5: [[410, 351]], 7: [[275, 330]], 8: [[402, 180], [375, 261], [323, 321]], 9: [[371, 199], [376, 238]], 12: [[318, 354]], 13: [[297, 284], [518, 226], [110, 283], [170, 337], [508, 299], [413, 384], [323, 388]], 14: [[274, 178]], 15: [[378, 347], [330, 349], [329, 367]], 17: [[367, 265], [189, 330], [216, 353]], 18: [[414, 289], [205, 343]], 19: [[433, 283], [199, 358], [262, 380]], 20: [[440, 270], [393, 279], [278, 324], [182, 364], [254, 350], [199, 396], [458, 399]]}
SUBJECT_SEEDS={6: [[216, 172], [257, 159], [180, 176], [299, 180], [197, 180], [133, 182], [137, 191], [207, 199], [158, 212], [206, 222], [377, 235], [321, 298], [242, 262], [474, 253], [481, 251], [462, 257], [468, 255], [358, 272], [381, 266], [394, 269], [426, 276], [349, 274], [388, 276], [327, 278], [329, 286], [438, 286], [384, 306], [459, 322], [412, 323], [100, 378], [144, 384], [463, 403], [244, 414]], 11: [[454, 174], [386, 269], [384, 320], [411, 351], [488, 359], [377, 398]]}

tiles=[];audit=[]
for n in range(1,21):
 trace=np.array(Image.open(ROOT/f'scripts/gym-challenge/traces/{n}.webp').convert('RGB'))
 clean=np.array(Image.open(ASSETS/f'{n}.png').convert('RGB'))
 color=[34,177,76]
 stroke=np.uint8((np.max(np.abs(trace.astype(int)-color),axis=2)<70)&(np.max(np.abs(trace.astype(int)-clean.astype(int)),axis=2)>20))*255
 stroke[:90]=0;stroke[467 if n>=17 else 430:]=0
 stroke=cv2.morphologyEx(stroke,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
 if n==9:cv2.line(stroke,(379,97),(475,97),255,3)
 if n in [6,11]:
  count,parts,stats,_=cv2.connectedComponentsWithStats(stroke)
  for part in range(1,count):
   if stats[part,cv2.CC_STAT_AREA]<6:stroke[parts==part]=0
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
 # The enclosed space between Alakazam's hands is background; the arc and
 # both spoons remain opaque. This inner contour follows the clean front.
 if n==16:
  gap=[(230,214),(234,197),(245,192),(247,181),(258,187),(267,173),(269,149),(281,145),(295,148),(304,122),(318,113),(334,127),(355,125),(377,113),(398,110),(422,108),(428,134),(446,146),(448,166),(426,167),(417,171),(418,184),(431,188),(449,186),(458,208),(464,228),(453,252),(426,267),(399,286),(369,278),(383,304),(386,324),(380,348),(365,373),(346,361),(320,342),(293,316),(288,308),(281,304),(277,288),(277,269),(273,257),(270,248),(263,246),(261,258),(260,267),(236,261),(224,242)]
  cv2.fillPoly(body,[np.array(gap,np.int32)],0)
  body=np.maximum(body,stroke)
 if n==11:
  # The supplied body outline is open to the left background. Close the
  # subject along its clean-front silhouette, independently of lightning.
  subject=[(251,97),(278,97),(298,114),(306,139),(305,152),(330,158),(343,173),(347,193),(351,213),(355,235),(356,250),(376,255),(400,253),(412,259),(412,268),(399,280),(376,291),(373,302),(378,321),(381,337),(392,352),(406,351),(432,350),(451,343),(472,341),(483,349),(485,365),(482,380),(473,386),(449,393),(422,398),(389,398),(360,397),(338,399),(320,410),(306,420),(191,420),(187,407),(187,390),(181,379),(181,364),(184,345),(186,328),(187,310),(183,291),(182,272),(175,258),(174,249),(161,241),(145,233),(138,223),(141,211),(137,192),(124,176),(69,146),(99,150),(135,153),(157,155),(182,164),(199,174),(216,159),(238,153),(250,151)]
  cv2.fillPoly(body,[np.array(subject,np.int32)],255)
  tail=[(65,320),(82,335),(109,353),(140,370),(163,379),(187,386),(187,395),(162,389),(137,379),(106,360),(78,339),(65,328)]
  cv2.fillPoly(body,[np.array(tail,np.int32)],255)
 body=cv2.resize(body,(1200,1650),interpolation=cv2.INTER_NEAREST)
 # Center ordinary outline strokes; preserve the width of painted lightning.
 if n not in [6,11]:body=cv2.erode(body,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))
 body=np.array(Image.fromarray(body).filter(ImageFilter.GaussianBlur(.6)))
 vertices=[(56,190),(551,190),(551,460),(56,460)] if n>=17 else [(65,98),(534,98),(534,356 if n==14 else 421),(65,356 if n==14 else 421)]
 window=np.zeros_like(body);cv2.fillPoly(window,[np.array(vertices,np.int32)*2],255)
 if n in [1,2,3,4,5,6,7,8,9,11,12,13,16]:
  badge=[(65,96),(139,96),(128,113),(126,123),(114,126),(111,135),(99,132),(88,143),(79,134),(65,141)]
  cv2.fillPoly(window,[np.array(badge,np.int32)*2],0)
 protection=np.maximum(body,255-window)
 for kind,data in [('foil',window),('protection',protection)]:Image.fromarray(data).save(OUT/f'{n}-{kind}.png',optimize=True)
 eff=window.astype(float)/255*(1-protection.astype(float)/255)
 preview=np.array(Image.fromarray(clean).resize((1200,1650)),dtype=float)
 overlay=np.uint8(preview*(1-eff[...,None]*.38)+np.array([0,225,255])*eff[...,None]*.38)
 Image.fromarray(overlay).save(REVIEW/f'{n}-mask-review.png')
 tile=Image.fromarray(overlay).crop((95,170,1120,940 if n>=17 else 865)).resize((410,300));ImageDraw.Draw(tile).text((4,4),str(n),fill='white',stroke_width=2,stroke_fill='black');tiles.append(tile)
 audit.append({'number':n,'protectedPixels':int((body>127).sum()),'solidLightning':n in [6,11],'holes':HOLES.get(n,[])})
sheet=Image.new('RGB',(410*4,300*5))
for i,tile in enumerate(tiles):sheet.paste(tile,(i%4*410,i//4*300))
sheet.save(REVIEW/'masks-contact.png')
(ROOT/'scripts/gym-challenge/mask-audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf8')
