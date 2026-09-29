"""Optical-only registration of #15's fine rays and granular R counter.
Uses the unchanged scan for locations; the user's angled photo establishes
which exposed regions reflect. Directions/strength are optical estimates,
not an inferred relief map. Subject protection remains a separate PNG.
"""
from pathlib import Path
import numpy as np
import cv2
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'public/cards/pokemon/team-rocket'
for edition in ['first-edition','unlimited']:
    source=ASSETS/('15.png' if edition=='first-edition' else 'unlimited/15.jpg')
    front=np.array(Image.open(source).convert('RGB').resize((1200,1650)),dtype=np.float32)/255
    light=np.max(front,axis=2)
    # Subtract only the low-frequency printed illumination, never alter front.
    contrast=light-cv2.GaussianBlur(light,(0,0),3.)
    dx=cv2.Sobel(light,cv2.CV_32F,1,0,ksize=3)
    dy=-cv2.Sobel(light,cv2.CV_32F,0,1,ksize=3)
    xx=cv2.GaussianBlur(dx*dx,(0,0),2.5)
    yy=cv2.GaussianBlur(dy*dy,(0,0),2.5)
    xy=cv2.GaussianBlur(dx*dy,(0,0),2.5)
    theta=.5*np.arctan2(2*xy,xx-yy)
    direction=np.empty((1650,1200,4),dtype=np.uint8)
    direction[:,:,0]=np.rint((np.cos(2*theta)*.5+.5)*255)
    direction[:,:,1]=np.rint((np.sin(2*theta)*.5+.5)*255)
    direction[:,:,2]=94
    direction[:,:,3]=np.rint(35+np.clip(contrast*5,0,1)*185)
    protection=np.array(Image.open(ASSETS/f'maps/15-{edition}-protection.png'))
    direction[protection>=254]=[255,128,94,0]
    Image.fromarray(direction).save(ASSETS/f'maps/15-{edition}-direction.png',optimize=True)
