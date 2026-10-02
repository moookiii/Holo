from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'public/cards/pokemon/wizards-promos'
a=np.array(Image.open(p/'5.png').convert('RGB')).astype(float)
# Separate dark stamped glyphs from blue sky, not print luminance as relief.
m=np.clip((105-a[:,:,0])/40,0,1)*np.clip((145-a[:,:,2])/45,0,1)
roi=np.zeros(m.shape,np.uint8);roi[104:192,365:520]=1
roi[179:, :386]=0
m*=roi
# Dragonite's antenna hides part of the logo: use the complementary Mewtwo
# scan for those glyphs, registered five pixels left and three up.
poly=np.array([[416,196],[443,167],[454,145],[466,135],[469,165],[465,196]],np.int32)
cut=np.zeros(m.shape,np.uint8);cv2.fillPoly(cut,[poly],1)
b=np.array(Image.open(p/'3.png').convert('RGB')).astype(float)
r=np.clip((100-b.max(axis=2))/45,0,1)
r[176:191,429:464]=np.clip((185-b[176:191,429:464].max(axis=2))/90,0,1)
r=cv2.warpAffine(r,np.float32([[1,0,-5],[0,1,-3]]),(600,825))
m=np.where(cut,r,m)*roi
# Continue the thin inner M outline visible in both complementary scans.
line=Image.new('L',(2400,3300));d=ImageDraw.Draw(line)
d.line([(int(x*4),int(y*4)) for x,y in [(454,150),(451.5,161),(456.5,163)]],fill=255,width=5)
m=np.maximum(m,np.array(line.resize((600,825),Image.Resampling.LANCZOS))/255)
# Repair missing ink within the small glyphs using the clean blue-sky scan.
# Keep the large Pokemon logo as outlines: never flood-fill its letter bodies.
small=np.clip((155-a[:,:,2])/65,0,1)*np.clip((135-a[:,:,0])/55,0,1)
small_roi=np.zeros(m.shape,np.uint8)
small_roi[104:132,365:520]=1
small_roi[173:192,385:520]=1
small_roi[cut>0]=0
m=np.maximum(m,small*small_roi)
# First is clearest against Mewtwo's pale aura. Recover the whole word,
# including the lighter scanned strokes omitted by the dark-metal threshold.
first=np.zeros(m.shape,np.float32)
first[175:191,427:464]=np.clip((230-b[175:191,427:464].max(axis=2))/95,0,1)
first=cv2.warpAffine(first,np.float32([[1,0,-5],[0,1,-3]]),(600,825))
m=np.maximum(m,first)
# Close subpixel breaks in the small letters only; do not fill glyph counters.
for y0,y1,x0,x1 in [(104,132,365,520),(172,192,385,520)]:
    glyphs=cv2.resize(m[y0:y1,x0:x1].astype(np.float32),None,fx=4,fy=4,interpolation=cv2.INTER_CUBIC)
    glyphs=cv2.morphologyEx(glyphs,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    m[y0:y1,x0:x1]=cv2.resize(glyphs,(x1-x0,y1-y0),interpolation=cv2.INTER_AREA).clip(0,1)
# Supersampled stroke repairs for discontinuities in the source scan.
repairs=Image.new('L',(2400,3300));pen=ImageDraw.Draw(repairs)
# Kids' s and the thin inner M contour; preserve their open surrounding print.
for points,width in [
    ([(401,119),(399,119),(398.5,120.5),(401,122),(401.5,123.5),(399,125),(397,125)],1.25),
    ([(463,145),(460,151),(458,157),(461,163)],1.1),
]:
    pen.line([(round(x*4),round(y*4)) for x,y in points],fill=255,width=round(width*4),joint='curve')
m=np.maximum(m,np.array(repairs.resize((600,825),Image.Resampling.LANCZOS))/255)
(p/'maps').mkdir(exist_ok=True)
# Independent scan registrations, preserving the outlined logo's counters.
transforms={2:(1.01,1,371,100),3:(1.01,.99,370,106),4:(1.02,1,368,104),5:(1,1,365,102)}
for number,(sx,sy,x,y) in transforms.items():
    mask=cv2.warpAffine((m*255).astype('uint8'),np.float32([[sx,0,x-365*sx],[0,sy,y-102*sy]]),(600,825))
    Image.fromarray(mask).save(p/f'maps/{number}-movie-gold.png')
    front=np.array(Image.open(p/f'{number}.png').convert('RGB'))
    alpha=mask[:,:,None]/255
    overlay=front*(1-alpha)+np.array([255,35,125])*alpha
    out=ROOT/'artifacts/movie-promos';out.mkdir(parents=True,exist_ok=True)
    Image.fromarray(overlay.astype('uint8')).crop((345,90,535,210)).resize((950,600)).save(out/f'{number}-overlay.png')
