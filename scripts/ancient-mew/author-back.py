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
# Color separation controls ink transmission, never height. Average the scan's
# photographed flecks before separating warm gold from cool navy, so the foil
# coverage does not reproduce those flecks as another optical texture.
color=cv2.GaussianBlur(im.astype(np.float32),(0,0),5)
warm=color[:,:,0]-color[:,:,2]
gold=np.clip((warm-12)/65,0,1)
gold=gold*gold*(3-2*gold)
foil=np.uint8(40+215*gold)
# Ink on the seven colored energy medallions filters and attenuates the foil.
for cx,cy,r in [(220,325,75),(1115,325,75),(225,1157,72),(1115,1157,72),(405,1350,75),(927,1350,75),(685,1600,75)]:
 cv2.circle(foil,(round(cx*w/1344),round(cy*h/1876)),round(r*w/1344),65,-1)
foil=cv2.GaussianBlur(foil,(11,11),2)
Image.fromarray(foil).save(root/'back-foil.png')
Image.fromarray(direction).save(root/'back-direction.png')
