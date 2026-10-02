from pathlib import Path
import numpy as np
from PIL import Image
import cv2
root=Path(__file__).resolve().parents[2]/'public/cards/ancient-mew'
im=np.array(Image.open(root/'back.jpeg'));h,w=im.shape[:2]
# One continuous sheet grating. The scan already contains photographed grain;
# randomizing axis, pitch or amplitude here adds a second layer of confetti.
# Axis and pitch are optical estimates from the supplied tilt video.
a=.45
direction=np.empty((h,w,4),np.uint8)
direction[:,:,0]=np.uint8((np.cos(2*a)*.5+.5)*255)
direction[:,:,1]=np.uint8((np.sin(2*a)*.5+.5)*255)
direction[:,:,2]=85
direction[:,:,3]=255
# Color separation controls foil coverage, never height. Average photographed
# flecks, then retain only the connected gold printing. Warm flecks inside the
# navy print must not become isolated holographic spots.
color=cv2.GaussianBlur(cv2.medianBlur(im,21).astype(np.float32),(0,0),3)
warm=color[:,:,0]-color[:,:,2]
def clean_gold(red_floor):
 mask=np.uint8((warm>35)&(color[:,:,0]>red_floor))*255
 mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
 return cv2.morphologyEx(mask,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(17,17)))

strong=clean_gold(140)
weak=clean_gold(95)
# Recover dim antialiased gold edges close to strong print, but reject the
# larger brown flecks photographed inside the navy panels.
near=cv2.dilate(strong,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(21,21)))
gold=np.minimum(weak,near)
border=np.zeros((h,w),np.uint8)
border[:round(85*h/2095)]=255
border[round(1995*h/2095):]=255
border[:,:round(84*w/1501)]=255
border[:,round(1416*w/1501):]=255
# The printed perimeter is gold even where the scan's light makes it green.
outline=np.zeros((h,w),np.uint8)
radius=round(55*w/1501)
cv2.rectangle(outline,(radius,0),(w-radius-1,h-1),255,-1)
cv2.rectangle(outline,(0,radius),(w-1,h-radius-1),255,-1)
for x in (radius,w-radius-1):
 for y in (radius,h-radius-1): cv2.circle(outline,(x,y),radius,255,-1)
gold=np.maximum(gold,np.minimum(border,outline))
count,labels,stats,_=cv2.connectedComponentsWithStats(gold)
gold=np.uint8(labels==1+np.argmax(stats[1:,cv2.CC_STAT_AREA]))*255
# The eight gem faces are foil too. Keep their measured circles inside the
# gold rims; the print outside these shapes remains matte navy.
gems=np.zeros((h,w),np.uint8)
sx,sy=w/1501,h/2095
for cx,cy,r in [(249,366,85),(1247,366,85),(747,983,97),(245,1283,85),
                (1245,1283,85),(467,1505,85),(1033,1505,85),(750,1756,85)]:
 cv2.circle(gems,(round(cx*sx),round(cy*sy)),round(r*sx),255,-1)
foil=cv2.GaussianBlur(np.maximum(gold,gems),(0,0),1.2)
Image.fromarray(foil).save(root/'back-foil.png')
Image.fromarray(direction).save(root/'back-direction.png')
