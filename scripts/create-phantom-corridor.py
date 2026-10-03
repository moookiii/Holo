"""Create original geometric corridor relief. Requires Pillow, numpy, scipy.
Run with an optional source JPG; subsequent runs use the retained front.
"""
from pathlib import Path
import sys, shutil, json, hashlib
import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import gaussian_filter, distance_transform_edt
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/cards/gengar-phantom-corridor'
OUT.mkdir(parents=True, exist_ok=True)
if len(sys.argv)>1: shutil.copyfile(sys.argv[1],OUT/'front.jpg')
front=Image.open(OUT/'front.jpg').convert('RGB')
w,h=front.size
# User-supplied registered cutout, retained exactly as decoded grayscale.
mask=Image.open(OUT/'subject-cutout.png').convert('L')
if mask.size != (w,h):
 raise ValueError('Subject cutout must match the source artwork dimensions')
subject=np.asarray(mask,dtype=np.float32)/255

y,x=np.mgrid[:h,:w].astype(np.float32)
u,v=x/w,y/h
dx,dy=(u-.665)*.5,v-.103
r=np.sqrt(dx*dx+dy*dy+.0016)
theta=np.arctan2(dx,dy)
# Relief uses geometry only, never print brightness or noise.
phase=92*theta+13*np.log(r+.11)+5*np.sin(v*6)
continuous=gaussian_filter(np.exp(-((np.sin(phase)*3.8)**2)),.65)*.18
# Differentiate BEFORE clipping to avoid a false raised subject outline.
gy,gx=np.gradient(continuous)
fade=np.clip(distance_transform_edt(subject<.03)/9,0,1)
nx,ny=-gx*3*fade,gy*3*fade
nz=np.ones_like(nx)
norm=np.sqrt(nx*nx+ny*ny+nz*nz)
normal=np.stack([nx/norm*.5+.5,ny/norm*.5+.5,nz/norm*.5+.5],2)
rgb=np.asarray(front,dtype=np.float32)/255
# Pigment controls foil coverage only, preserving black brushwork.
pigment=np.clip((rgb.max(2)-.06)/.48,0,1)
foil=(.12+.70*pigment)*(1-subject)
roughness=.31+.14*subject
height=.5+continuous*fade
laminate=.045*(1-subject)+.008*subject
zero=np.zeros_like(subject)
one=np.ones_like(subject)
maps=dict(protection=subject,foil=foil,height=height,normal=normal,roughness=roughness,laminate=laminate,pattern=1-subject,sparkle=zero,metallic=zero,secondaryFoil=zero,direction=np.stack([one*(np.cos(-.84)*.5+.5),one*(np.sin(-.84)*.5+.5),one*.5,one],2),coverage=np.stack([foil,zero,zero,laminate],2),surface=np.stack([height,roughness,zero,one],2))
for name,data in maps.items():
 Image.fromarray(np.uint8(np.clip(np.rint(data*255),0,255))).save(OUT/f'{name}.png',optimize=True)
edge=np.asarray(mask.filter(ImageFilter.MaxFilter(9)),dtype=float)-np.asarray(mask.filter(ImageFilter.MinFilter(9)),dtype=float)
overlay=np.asarray(front).copy()
overlay[edge>25]=[32,255,132]
Image.fromarray(overlay).save(OUT/'boundary-review.png')
(OUT/'source.json').write_text(json.dumps(dict(title='Gengar - Phantom Corridor',source='User-supplied 67e425ee95c5db6b79ae4cc767062698.jpg',sha256=hashlib.sha256((OUT/'front.jpg').read_bytes()).hexdigest(),size=[w,h],design='Original perspective-flute relief with uniform grating. Not a physical printing reconstruction; spacing and depth are artistic choices.',protection='User-supplied front - Copy.jpg silhouette, decoded to subject-cutout.png without resizing, thresholding or additional feathering; white protects Gengar.',maps=list(maps)),indent=2)+'\n',encoding='utf-8')
print(f'Created {len(maps)} registered PNG maps at {w} x {h}')
