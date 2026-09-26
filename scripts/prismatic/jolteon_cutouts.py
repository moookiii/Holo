"""Register user-authored outlines; relief awaits the missing exact-card photo."""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageFilter
ROOT=Path(__file__).resolve().parents[2]
REF=ROOT/'research/prismatic-evolutions/jolteon-153'
OUT=ROOT/'scripts/prismatic/jolteon-153'
REVIEW=ROOT/'artifacts/jolteon-153'
OUT.mkdir(exist_ok=True); REVIEW.mkdir(exist_ok=True)
im=np.array(Image.open(REF/'outlined-front.png').convert('RGB'))
def stroke(color):
    m=(np.max(abs(im.astype(int)-color),axis=2)<45).astype('uint8')*255
    return cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
green=stroke((34,177,76)); red=stroke((136,0,21))
contours,h=cv2.findContours(green,cv2.RETR_TREE,cv2.CHAIN_APPROX_SIMPLE)
body=np.zeros(green.shape,np.uint8)
outer=max(contours,key=cv2.contourArea)
cv2.drawContours(body,[outer],-1,255,cv2.FILLED)
# The small opening below the jaw is deliberately background.
for c in contours:
    x,y,w,h=cv2.boundingRect(c)
    if 372<=x<=375 and 313<=y<=316 and w>20:
        cv2.drawContours(body,[c],-1,0,cv2.FILLED)
body=cv2.erode(body,np.ones((3,3),np.uint8))
# The crown outline joins the top banner and the green forehead boundary.
barrier=cv2.bitwise_or(red,green)
cv2.line(barrier,(166,137),(346,137),255,2)
cv2.line(barrier,(236,250),(242,257),255,2)
cv2.line(barrier,(375,221),(377,230),255,2)
barrier=cv2.morphologyEx(barrier,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
def region(seed):
    tmp=barrier.copy(); cv2.floodFill(tmp,None,seed,128)
    return (tmp==128).astype('uint8')*255
crown=region((260,180))
assert np.count_nonzero(crown)<50000, 'Crown contour leaked into background'
gems=crown.copy()
# Separate closed floating jewels, including the title-overlapped ones.
for seed in [(38,180),(36,240),(63,280),(102,292),(140,292),
             (152,225),(108,43),(208,32),(211,50),(213,69)]:
    piece=region(seed)
    assert np.count_nonzero(piece)<5000, ('Gem contour leaked',seed)
    gems=np.maximum(gems,piece)
gems=cv2.dilate(gems,np.ones((3,3),np.uint8))
gems[body>127]=0
front=Image.open(ROOT/'public/cards/pokemon/prismatic-evolutions/153.png').convert('RGB').resize((1800,2475))
for name,m,color in [('body',body,(255,0,160)),('gems',gems,(0,255,140))]:
    mask=Image.fromarray(m).resize((1800,2475),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.6))
    mask.save(OUT/(name+'.png'))
    rgb=np.array(front,dtype=float); a=np.array(mask,dtype=float)[...,None]/255*.45
    overlay=Image.fromarray(np.uint8(rgb*(1-a)+np.array(color)*a))
    overlay.resize((900,1238)).save(REVIEW/(name+'-overlay.png'))
# Concentric relief coordinates, not reflective discs: symbols stay protected.
y,x=np.mgrid[:2475,:1800]/3
rings=np.zeros(x.shape)
for cx,cy,r in [(58,494,17),(94,494,17),(58,618,17),(94,618,17),(130,618,17)]:
    distance=np.hypot(x-cx,y-cy)
    rings=np.maximum(rings,np.clip((r-distance)*3,0,1))
Image.fromarray(np.uint8(rings*255)).save(OUT/'energy-discs.png')

