"""Espeon masks registered from the supplied colored outline and clean front."""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
ROOT=Path(__file__).resolve().parents[2]
REF=ROOT/'research/prismatic-evolutions/espeon-155'
OUT=ROOT/'scripts/prismatic/espeon-155'
REVIEW=ROOT/'artifacts/espeon-155'
im=np.array(Image.open(REF/'outlined-front.png').convert('RGB'))
g=(np.max(abs(im.astype(int)-[34,177,76]),2)<40).astype('uint8')
r=(np.max(abs(im.astype(int)-[136,0,21]),2)<40).astype('uint8')
barrier=cv2.morphologyEx(g|r,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
_,labels,stats,_=cv2.connectedComponentsWithStats(1-barrier)
def inside(seeds):
    ids=[labels[y,x] for x,y in seeds]
    assert all(25<stats[i,4]<40000 for i in ids)
    return np.uint8(np.isin(labels,ids))*255
body=inside([(280,370)])
gems=inside([(275,245),(275,200),(150,205),(400,225),(453,250),
             (159,426),(391,452),(506,501),(214,526),(168,548)])
k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5))
body=cv2.dilate(body,k);gems=cv2.dilate(gems,k)
# Follow the actual forehead contour under the crystal tips rather than the
# broad green annotation. No horizontal band joins the bases of the crystals.
forehead=Image.new('L',(600,825));d=ImageDraw.Draw(forehead)
d.polygon([(222,302),(232,296),(244,292),(255,289),(269,288),(284,291),
 (295,296),(306,303),(315,314),(323,326),(292,352),(233,333)],fill=255)
f=np.array(forehead)
gems[f>0]=0;body=np.maximum(body,f)
# Tiny solid annotation marks have no flood-fill interior: trace their clean
# four-point star silhouettes explicitly instead of dropping them.
stars=Image.new('L',(600,825));sd=ImageDraw.Draw(stars)
for cx,cy,rx,ry in [(110,192,5,9),(185,178,5,9),(255,168,4,8),
                    (373,182,8,13),(432,219,4,7),(479,222,5,9),
                    (109,250,6,11),(419,265,7,11)]:
    sd.polygon([(cx,cy-ry),(cx+rx,cy),(cx,cy+ry),(cx-rx,cy)],fill=255)
gems=np.maximum(gems,np.array(stars))
gems[body>127]=0
front=np.array(Image.open(ROOT/'public/cards/pokemon/prismatic-evolutions/155.png').convert('RGB').resize((1800,2475)),float)
for name,m,color in [('body',body,(255,0,160)),('gems',gems,(0,255,140))]:
    mask=Image.fromarray(m).resize((1800,2475),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.6))
    mask.save(OUT/(name+'.png'))
    a=np.array(mask)[...,None]/255*.48
    Image.fromarray(np.uint8(front*(1-a)+np.array(color)*a)).resize((900,1238)).save(REVIEW/(name+'-overlay.png'))
