"""Create original geometric corridor relief. Requires Pillow, numpy, scipy.
Run with an optional source JPG; subsequent runs use the retained front.
"""
from pathlib import Path
import sys, shutil, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter, distance_transform_edt
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/cards/gengar-phantom-corridor'
OUT.mkdir(parents=True, exist_ok=True)
if len(sys.argv)>1: shutil.copyfile(sys.argv[1],OUT/'front.jpg')
front=Image.open(OUT/'front.jpg').convert('RGB')
w,h=front.size
# Hand-traced perimeter in 1024 x 2048 display coordinates; antialiased ink guard.
outline=[(391,659),(418,689),(447,720),(477,767),(497,745),(515,769),(538,741),(562,706),(584,684),(594,729),(609,774),(638,752),(669,732),(650,774),(686,751),(722,728),(751,706),(775,686),(768,721),(751,767),(734,809),(717,845),(706,866),(746,840),(730,883),(776,884),(760,916),(776,906),(768,939),(777,958),(768,977),(779,992),(767,1010),(775,1028),(764,1065),(750,1098),(729,1118),(704,1115),(689,1107),(677,1125),(658,1140),(643,1155),(619,1158),(598,1163),(575,1152),(554,1158),(533,1156),(522,1174),(491,1174),(468,1199),(451,1181),(435,1183),(416,1167),(403,1145),(385,1128),(374,1102),(365,1075),(356,1045),(358,1011),(363,974),(365,950),(375,920),(371,891),(384,859),(393,820),(397,778),(389,742),(391,699)]
mask=Image.new('L',(w*2,h*2))
ImageDraw.Draw(mask).polygon([(round(x*w/1024*2),round(y*h/2048*2)) for x,y in outline],fill=255)
mask=mask.resize((w,h),Image.Resampling.LANCZOS).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(.7))
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
(OUT/'source.json').write_text(json.dumps(dict(title='Gengar - Phantom Corridor',source='User-supplied 67e425ee95c5db6b79ae4cc767062698.jpg',sha256=hashlib.sha256((OUT/'front.jpg').read_bytes()).hexdigest(),size=[w,h],design='Original perspective-flute relief with uniform grating. Not a physical printing reconstruction; spacing and depth are artistic choices.',protection='Hand-traced silhouette with antialiased ink guard; eyes, teeth and body remain opaque.',maps=list(maps)),indent=2)+'\n',encoding='utf-8')
print(f'Created {len(maps)} registered PNG maps at {w} x {h}')
