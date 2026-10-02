from pathlib import Path
import cv2,numpy as np,json
from PIL import Image
root=Path('public/cards/pokemon/wizards-promos');out=root/'maps';out.mkdir(exist_ok=True)
review=Path('artifacts/wizards-holos');review.mkdir(parents=True,exist_ok=True)
for n in [9,10,11,13,15,17,24,34,35]:
 clean=np.array(Image.open(root/f'{n}.png').convert('RGB').resize((600,825)))
 trace=np.array(Image.open(f'scripts/wizards-holos/traces/{n}.webp').convert('RGB'))
 stroke=np.uint8((np.max(abs(trace.astype(int)-[34,177,76]),axis=2)<65)&(np.max(abs(trace.astype(int)-clean.astype(int)),axis=2)>18))*255
 stroke[:95]=0;stroke[425:]=0
 stroke=cv2.morphologyEx(stroke,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
 contours,_=cv2.findContours(stroke,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 body=np.zeros((825,600),np.uint8);cv2.drawContours(body,[c for c in contours if cv2.contourArea(c)>20],-1,255,-1)
 _,labels=cv2.connectedComponents(255-stroke)
 for x,y in {9:[(190,240),(440,240)],10:[(380,380)],17:[(170,240)],24:[(289,350)]}.get(n,[]):
  label=labels[y,x]
  if label>1:body[labels==label]=0
 foil=np.zeros_like(body);cv2.rectangle(foil,(65,98),(534,421),255,-1)
 if n in [13,17]:cv2.fillPoly(foil,[np.array([(65,96),(139,96),(125,123),(111,135),(99,132),(88,143),(65,141)])],0)
 if n in [34,35]:
  foil[:]=0;cv2.rectangle(foil,(23,23),(578,801),255,-1)
  body[:]=0;cv2.rectangle(body,(51,84),(548,436),255,-1)
  # Printed yellow labels and energy symbols stay opaque; dark lettering is
  # protected by its individual connected strokes, not a rectangular text band.
  hsv=cv2.cvtColor(clean,cv2.COLOR_RGB2HSV)
  gold=np.uint8((hsv[:,:,0]>15)&(hsv[:,:,0]<40)&(hsv[:,:,1]>70)&(hsv[:,:,2]>110))*255
  gold[:440]=0;body=np.maximum(body,gold)
  gray=cv2.cvtColor(clean,cv2.COLOR_RGB2GRAY)
  ink=np.uint8((gray<150)&(gray.astype(float)<cv2.GaussianBlur(gray,(0,0),4).astype(float)-4))*255
  ink[85:440]=0
  count,parts,stats,_=cv2.connectedComponentsWithStats(ink)
  for i in range(1,count):
   if 3<stats[i,4]<20000:body[parts==i]=255
  body=cv2.dilate(body,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))
  # Keep a quiet reflective background beneath the dense rules, with stronger
  # foil at the header and side strips. Letter shapes remain separately opaque.
  foil[470:790,95:548]=np.minimum(foil[470:790,95:548],65)
  if n==35:cv2.rectangle(body,(146,479),(546,541),255,-1)
  for x,y,r in ([(529,61,22),(50,611,18),(91,611,18),(70,647,18),(88,715,18),(502,716,18)] if n==34 else [(527,62,23),(70,618,19),(83,513,42)]):cv2.circle(body,(x,y),r,255,-1)
 protection=np.maximum(body,255-foil)
 for k,a in [('foil',foil),('protection',protection)]:Image.fromarray(a).resize((1200,1650),Image.Resampling.LANCZOS).save(out/f'{n}-{k}.png')
 eff=foil/255*(1-protection/255);Image.fromarray(np.uint8(clean*(1-eff[:,:,None]*.4)+[0,100,100]*eff[:,:,None])).save(review/f'{n}.png')
