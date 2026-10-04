from pathlib import Path
import re, json, hashlib, argparse
import numpy as np,cv2
from PIL import Image,ImageDraw,ImageFilter
from umbreon_gx_geometry import BODY,LEG_GAP,EAR,EAR_RING,TAIL,TAIL_RING,REAR_EAR,EYE,GX,RULE,BARS
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/cards/umbreon-gx-sm1-154'; REF=ROOT/'research/umbreon-gx-sm1-154'; REVIEW=ROOT/'artifacts/umbreon-gx-sm1-154'
W,H,S=1800,2475,3
parser=argparse.ArgumentParser()
parser.add_argument('--normal-only',action='store_true',help='Rebuild normal.png using the edited body and protection PNGs without overwriting other maps.')
parser.add_argument('--derived-only',action='store_true',help='Rebuild normal, height, and roughness from the edited body and protection PNGs.')
args=parser.parse_args()
use_edited_masks=args.normal_only or args.derived_only
y,x=np.mgrid[:H,:W].astype(np.float32)/S

def read_mask(name):
 im=Image.open(OUT/(name+'.png')).convert('RGBA')
 if im.size!=(W,H): raise ValueError(f'{name}.png must be {W}x{H}')
 rgba=np.asarray(im,np.float32)/255
 return np.asarray(im.convert('L'),np.float32)/255*rgba[:,:,3]

def path_points(path):
 t=re.findall(r'[MLQCZ]|-?\d*\.?\d+',path); i=0; out=[]; p=np.zeros(2)
 while i<len(t):
  op=t[i]; i+=1
  if op=='Z': out.append(out[0]); continue
  n={'M':2,'L':2,'Q':4,'C':6}[op]; a=np.array([float(v) for v in t[i:i+n]]).reshape(-1,2); i+=n
  if op in ('M','L'): out.append(a[0]); p=a[0]; continue
  for u in np.linspace(0,1,70)[1:]:
   q=(1-u)**2*p+2*(1-u)*u*a[0]+u*u*a[1] if op=='Q' else (1-u)**3*p+3*(1-u)**2*u*a[0]+3*(1-u)*u*u*a[1]+u**3*a[2]
   out.append(q)
  p=a[-1]
 return [(round(q[0]*S),round(q[1]*S)) for q in out]
def mask(path):
 im=Image.new('L',(W,H)); ImageDraw.Draw(im).polygon(path_points(path),fill=255)
 return np.asarray(im.filter(ImageFilter.GaussianBlur(.65)),np.float32)/255

def slope(h):
 gy,gx=np.gradient(h,1/S,1/S); return gx,gy
body=mask(BODY)*(1-mask(LEG_GAP))
if use_edited_masks: body=read_mask('body')
gxbar=mask(GX); rule=mask(RULE); bars=np.maximum.reduce([mask(p) for p in BARS]); eye=mask(EYE)
front=np.asarray(Image.open(OUT/'front.png').convert('RGB').resize((W,H)),np.float32)/255
# Independent glyph protection. Only dark connected strokes with white keylines,
# bounded by known typography regions, are allowed to protect print.
zones=np.zeros((H,W),np.float32)
for a,b,c,d in [(99,18,279,57),(423,18,535,64),(89,65,218,83),(9,23,85,49),
 (184,365,280,403),(527,365,580,403),(31,403,572,432),(31,429,148,452),
 (184,474,390,507),(525,472,579,507),(31,511,575,536),(31,535,574,559),(31,558,265,584),
 (16,721,345,745),(394,721,449,746),
 (23,757,162,815)]: zones[b*S:d*S,a*S:c*S]=1
black=(front.max(2)<.30).astype(np.uint8)
white=(front.min(2)>.73)&(front.max(2)-front.min(2)<.2)
near=cv2.dilate(black,np.ones((9,9),np.uint8))
ink=((black>0)|(white&(near>0)))*zones
ink=cv2.dilate(ink.astype(np.float32),np.ones((3,3),np.uint8))
# Close each enclosed glyph, never the whole text row.
cs,_=cv2.findContours(np.uint8(ink*255),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
filled=np.zeros((H,W),np.uint8); cv2.drawContours(filled,cs,-1,255,cv2.FILLED)
protection=np.maximum(ink,filled/255)
portrait=mask('M12 58 L35 48 L70 49 L86 66 L84 104 L66 124 L31 123 L12 106 Z')
protection=np.maximum(protection,portrait)
# Blue GX effect ink and its complete white keylines share the targeted repair.
from umbreon_gx_text import protect_gx_text
protection=protect_gx_text(front,protection,S)
# White lettering on the smooth dark banners is protected by its glyphs,
# never by a filled text-row rectangle.
for a,b,c,d in [(190,598,410,629),(221,770,561,802)]:
 glyphs=np.zeros((H,W),np.uint8)
 glyphs[b*S:d*S,a*S:c*S]=np.uint8(white[b*S:d*S,a*S:c*S])*255
 protection=np.maximum(protection,cv2.dilate(glyphs,np.ones((3,3),np.uint8))/255)
# Rebuild the four small footer words from their printed letter colors. The
# general dark/white keyline pass loses their soft gray or blue antialiasing.
# Tight bounds and a subpixel edge keep gaps and counters open.
for a,b,c,d,kind in [(15,723,81,740,'dark'),(397,722,450,742,'dark'),
                      (498,764,544,781,'light'),(24,803,111,816,'copyright')]:
 y0,y1=b*S,d*S; x0,x1=a*S,c*S
 rgb=front[y0:y1,x0:x1]; hi=rgb.max(2); lo=rgb.min(2)
 luminance=rgb@np.array([.2126,.7152,.0722],np.float32)
 if kind=='light': letters=(lo>.60)&(hi-lo<.23)
 else: letters=(luminance<(.45 if kind=='copyright' else .52))&(hi-lo<(.23 if kind=='copyright' else .22))
 radius=2 if kind=='copyright' else 1
 glyphs=cv2.dilate(np.uint8(letters)*255,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(radius*2+1,radius*2+1)))
 protection[y0:y1,x0:x1]=cv2.GaussianBlur(glyphs,(0,0),.55)/255
# Smooth GX title and rule backdrops retain their reflective substrate.
smooth=np.maximum.reduce([gxbar,rule,eye,portrait])
# Each triangle has one family of parallel cuts, as resolved in the angled
# photograph. Nested edge-distance cuts split a triangle into three regions
# that join neighboring regions into apparent diamonds under illumination.
side=30.0; altitude=side*np.sqrt(3)/2; pitch=2.3
# The reference's triangular faces point left/right in the print plane.
angle=np.radians(30); ca,sa=np.cos(angle),np.sin(angle)
xx=(x-8)*ca+(y-12)*sa; yy=-(x-8)*sa+(y-12)*ca
u=xx/side-yy/(2*altitude); v=yy/altitude
col=np.floor(u).astype(np.int32); row=np.floor(v).astype(np.int32)
up=(u-col+v-row)<1
# A three-axis repeat with no equal-axis neighbors across a triangle edge.
region_labels=(col+row+np.where(up,0,2))%3
# Cuts end just before the neighboring face, leaving the narrow smooth joins
# visible in the photograph. This clips precomputed slopes, not a raised rim.
fu=u-col; fv=v-row
bary=np.stack([np.where(up,fu,1-fu),np.where(up,fv,1-fv),np.where(up,1-fu-fv,fu+fv-1)])
join=np.clip((bary.min(0)*altitude-.25)/.3,0,1)
weights=np.stack([(region_labels==k).astype(np.float32)*join for k in range(3)])
height=np.zeros((H,W),np.float32); nx=height.copy(); ny=height.copy()
for k,angle in enumerate(np.radians([90,30,150])):
 phase=x*np.cos(angle)+y*np.sin(angle)
 h=.72*np.cos(phase*2*np.pi/pitch)
 # Differentiate the uninterrupted groove field before clipping to its cell;
 # a material transition must not produce a raised triangular outline.
 hx,hy=slope(h); w=weights[k]
 height+=h*w; nx+=hx*w; ny+=hy*w
polygons=[]
for row in range(-40,50):
 for col in range(-50,60):
  a=np.array([side*(col+row/2),altitude*row]); b=a+[side,0]; c=a+[side/2,altitude]; d=a+[side*1.5,altitude]
  for tip,pts in enumerate([np.array([a,b,c]),np.array([b,d,c])]):
   pts=pts@np.array([[ca,sa],[-sa,ca]])+np.array([8,12])
   if pts[:,0].max()<0 or pts[:,0].min()>W/S or pts[:,1].max()<0 or pts[:,1].min()>H/S: continue
   polygons.append({'points':pts.tolist(),'axis':int((col+row+2*tip)%3)})
# Photo-guided body flow: tall longitudinal curves bend around the eye, cheek,
# shoulder and haunch. Fine grooves remain continuous inside each body region.
phase=x+28*np.sin((y-250)/83)+15*np.sin(y/48)+24*np.exp(-((x-135)/75)**2-((y-227)/56)**2)
h=.93*np.sin(phase*2*np.pi/2.25); hx,hy=slope(h)
nx=nx*(1-body)+hx*body; ny=ny*(1-body)+hy*body; height=height*(1-body)+h*body
for path,phase,pitch in [(EAR,.57*x+.82*y,2.15),(EAR_RING,x+11*np.sin(y/39),2.25),(REAR_EAR,y+8*np.sin(x/35),2.1),
 (TAIL,np.hypot((x-431)*.9,y-228),2.2),(TAIL_RING,y+9*np.sin(x/35),2.15)]:
 region=mask(path)
 if use_edited_masks: region*=body
 h=.93*np.sin(phase*2*np.pi/pitch); hx,hy=slope(h)
 nx=nx*(1-region)+hx*region; ny=ny*(1-region)+hy*region; height=height*(1-region)+h*region
# Silver trim is a wave engraving; the outer edge carries the same finish.
rim=1-mask('M21 14 L579 14 L588 25 L589 798 L577 813 L22 813 L10 800 L10 25 Z')
wave=np.maximum(bars,rim); h=.8*np.sin((x+2.2*np.sin(y*.23))*2*np.pi/2.0); hx,hy=slope(h)
nx=nx*(1-wave)+hx*wave; ny=ny*(1-wave)+hy*wave; height=height*(1-wave)+h*wave
nx*=1-smooth; ny*=1-smooth; height*=1-smooth
energy=np.zeros((H,W),np.float32)
for cx,cy,r in [(46,382,17),(46,488,17),(82,488,17),(117,488,17),(46,612,17),(81,612,17),(559,38,21)]:
 dist=np.hypot(x-cx,y-cy); region=np.clip((r-dist)*3,0,1); energy=np.maximum(energy,region)
 h=.8*np.cos(dist*2*np.pi/1.35); hx,hy=slope(h)
 nx=nx*(1-region)+hx*region; ny=ny*(1-region)+hy*region; height=height*(1-region)+h*region
 # Central energy symbols remain opaque but rings retain relief.
 protection=np.maximum(protection,region*black)
if use_edited_masks: protection=read_mask('protection')
active=1-protection; nx*=active; ny*=active; height*=active
normal=np.stack([-nx*.16,ny*.16,np.ones_like(nx)],axis=2); normal/=np.linalg.norm(normal,axis=2,keepdims=True)
rough=.32+.035*body-.025*wave; rough=rough*(1-smooth)+.23*smooth
if use_edited_masks:
 derived={'normal':normal*.5+.5}
 if args.derived_only: derived.update({'height':.5+height*.22,'roughness':rough})
 for name,data in derived.items():
  temporary=OUT/(name+'.tmp.png')
  Image.fromarray(np.uint8(np.clip(data,0,1)*255)).save(temporary)
  temporary.replace(OUT/(name+'.png'))
 manifest=json.loads((OUT/'source.json').read_text())
 for name in ['body.png','protection.png']+[name+'.png' for name in derived]:
  manifest['maps'][name]=hashlib.sha256((OUT/name).read_bytes()).hexdigest()
 (OUT/'source.json').write_text(json.dumps(manifest,indent=2)+'\n')
 raise SystemExit(0)
foil=np.ones((H,W),np.float32)*.97
arrays={'body':body,'bars':wave,'gx-smooth':gxbar*(1-energy),'energy':energy,'foil':foil,'protection':protection,'height':.5+height*.22,'normal':normal*.5+.5,'roughness':rough}
for name,data in arrays.items(): Image.fromarray(np.uint8(np.clip(data,0,1)*255)).save(OUT/(name+'.png'))
for name,m,color in [('body',body,(255,0,150)),('smooth',smooth*(1-energy),(0,200,255)),('protection',protection,(70,80,255))]:
 overlay=front*(1-m[...,None]*.48)+np.array(color)/255*m[...,None]*.48
 Image.fromarray(np.uint8(np.clip(overlay,0,1)*255)).resize((900,1238)).save(REVIEW/(name+'-overlay.png'))
colors=np.array([[255,180,70],[60,180,255],[190,60,225]])/255
viz=np.einsum('khw,kc->hwc',weights,colors); vis=(1-body)*(1-smooth)*(1-protection)
Image.fromarray(np.uint8(np.clip(front*(1-vis[...,None]*.65)+viz*vis[...,None]*.65,0,1)*255)).resize((900,1238)).save(REVIEW/'triangle-axes.png')
(REF/'traced-groove-regions.json').write_text(json.dumps(polygons))
manifest={'card':'sm1-154','source':'https://assets.tcgdex.net/en/sm/sm1/154/high.png','maps':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.glob('*.png')},'method':'Congruent interlaced equilateral triangles with one parallel groove family per triangle, reconstructed from complementary photographs. No photographed brightness becomes height. Body and bars are traced in TCGdex print coordinates.','estimates':'Triangle side (30 print pixels), 30-degree lattice rotation, lattice phase, groove pitch (2.3 print pixels), depth and the leg contour obscured by the GX banner are estimates guided by the photographs.'}
(OUT/'source.json').write_text(json.dumps(manifest,indent=2)+'\n')

# Keep legacy region authoring, but replace its generated relief with the exact
# reviewed TCGL etch and the required Sylveon finish before delivery.
if __name__ == "__main__":
    import subprocess as _tcgl_subprocess
    import sys as _tcgl_sys
    _tcgl_root = Path(__file__).resolve().parents[1]
    _tcgl_subprocess.run([_tcgl_sys.executable, str(_tcgl_root / "scripts/tcgl/convert_etched_cards.py"), "--card", "sm1-154"], check=True)
