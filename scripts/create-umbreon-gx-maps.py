from pathlib import Path
import re, json, hashlib
import numpy as np,cv2
from PIL import Image,ImageDraw,ImageFilter
from umbreon_gx_geometry import BODY,EAR,EAR_RING,TAIL,TAIL_RING,REAR_EAR,EYE,GX,RULE,BARS
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/cards/umbreon-gx-sm1-154'; REF=ROOT/'research/umbreon-gx-sm1-154'; REVIEW=ROOT/'artifacts/umbreon-gx-sm1-154'
W,H,S=1800,2475,3
y,x=np.mgrid[:H,:W].astype(np.float32)/S

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
body=mask(BODY); gxbar=mask(GX); rule=mask(RULE); bars=np.maximum.reduce([mask(p) for p in BARS]); eye=mask(EYE)
front=np.asarray(Image.open(OUT/'front.png').convert('RGB').resize((W,H)),np.float32)/255
# Independent glyph protection. Only dark connected strokes with white keylines,
# bounded by known typography regions, are allowed to protect print.
zones=np.zeros((H,W),np.float32)
for a,b,c,d in [(99,18,279,57),(423,18,535,64),(89,65,218,83),(9,23,85,49),
 (184,365,280,403),(527,365,580,403),(31,403,572,432),(31,429,148,452),
 (184,474,390,507),(525,472,579,507),(31,511,575,536),(31,535,574,559),(31,558,265,584),
 (29,640,573,667),(29,666,302,690),(16,721,345,745),(394,721,449,746),
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
# Isolate the blue/orange GX effect glyphs by their enclosed white keylines.
gz=np.zeros((H,W),np.uint8); gz[640*S:690*S,29*S:575*S]=1
gwhite=(white*gz).astype(np.uint8)*255
cc,_=cv2.findContours(gwhite,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
glyph=np.zeros_like(gwhite)
for c in cc:
 if cv2.contourArea(c)>4: cv2.drawContours(glyph,[c],-1,255,cv2.FILLED)
protection=np.maximum(protection,cv2.dilate(glyph,np.ones((3,3),np.uint8))/255)
# Smooth GX title and rule backdrops retain their reflective substrate.
smooth=np.maximum.reduce([gxbar,rule,eye,portrait])
# Use the photo ONLY to recover geometric groove-axis regions; brightness and
# photographic highlights never become height. Quantize the three background
# groove families, simplify their contours, then re-engrave periodic lines.
axes=np.radians([90,30,150]); accumulated=np.zeros((3,H,W),np.float32)
for reference in ['registered-photo.png','registered-angle.png']:
 photo=cv2.imread(str(REVIEW/reference),cv2.IMREAD_GRAYSCALE).astype(np.float32)/255
 photo=photo-cv2.GaussianBlur(photo,(0,0),7)
 dx=cv2.Sobel(photo,cv2.CV_32F,1,0,ksize=3); dy=cv2.Sobel(photo,cv2.CV_32F,0,1,ksize=3)
 jxx=cv2.GaussianBlur(dx*dx,(0,0),8); jyy=cv2.GaussianBlur(dy*dy,(0,0),8); jxy=cv2.GaussianBlur(dx*dy,(0,0),8)
 theta=.5*np.arctan2(2*jxy,jxx-jyy)
 coherence=np.sqrt((jxx-jyy)**2+4*jxy*jxy)/(jxx+jyy+1e-7)
 accumulated+=np.stack([np.cos(2*(theta-a)) for a in axes])*coherence
labels=np.argmax(accumulated,axis=0).astype(np.uint8)
labels=cv2.medianBlur(labels,21)
# Reconstruct a planar triangle mesh from the corners of the measured
# orientation regions. This removes photographic specks and curved/noisy
# boundaries while retaining photo-derived junction locations.
from scipy.spatial import Delaunay
corners=[]
for k in range(3):
 raw=(labels==k).astype(np.uint8)*255
 contours,_=cv2.findContours(raw,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 for c in contours:
  area=cv2.contourArea(c)
  if area<500 or area>12000: continue
  approx=cv2.approxPolyDP(c,max(5,cv2.arcLength(c,True)*.035),True)
  corners.extend(approx[:,0,:].tolist())
# Snap repeated observations of each junction to the same print-plane point.
points=np.asarray(corners,np.float32)
from scipy.spatial import cKDTree
used=np.zeros(len(points),bool); vertices=[]
tree=cKDTree(points)
for i,q in enumerate(points):
 if used[i]: continue
 group=tree.query_ball_point(q,15); used[group]=True
 vertices.append(points[group].mean(0))
# Obscured areas get only regular continuation; visible junctions remain measured.
for py in range(0,H+80,80):
 for px in range(0,W+80,80):
  if tree.query((px,py))[0]>70: vertices.append([px,py])
vertices=np.array(vertices)
triangulation=Delaunay(vertices)
region_labels=np.zeros((H,W),np.uint8)
polygons=[]
for simplex in triangulation.simplices:
 pts=np.rint(vertices[simplex]).astype(np.int32)
 center=pts.mean(0); cx,cy=np.clip(center.astype(int),[0,0],[W-1,H-1])
 # Majority orientation over the triangle interior, rejecting boundary gradients.
 samples=[]
 for u,v in [(.33,.33),(.2,.2),(.6,.2),(.2,.6)]:
  q=pts[0]*u+pts[1]*v+pts[2]*(1-u-v)
  sx,sy=np.clip(q.astype(int),[0,0],[W-1,H-1]); samples.append(labels[sy,sx])
 k=int(np.bincount(samples,minlength=3).argmax())
 cv2.fillConvexPoly(region_labels,pts,k)
 polygons.append({'axis':k,'points':(pts/S).round(2).tolist()})
weights=np.stack([(region_labels==k).astype(np.float32) for k in range(3)])
weights/=np.maximum(weights.sum(0),1)
height=np.zeros((H,W),np.float32); nx=height.copy(); ny=height.copy()
for k,angle in enumerate(axes):
 phase=x*np.cos(angle)+y*np.sin(angle)
 h=.86*np.sin(phase*2*np.pi/2.05)
 hx,hy=slope(h); w=weights[k]
 height+=h*w; nx+=hx*w; ny+=hy*w
# Photo-guided body flow: tall longitudinal curves bend around the eye, cheek,
# shoulder and haunch. Fine grooves remain continuous inside each body region.
phase=x+28*np.sin((y-250)/83)+15*np.sin(y/48)+24*np.exp(-((x-135)/75)**2-((y-227)/56)**2)
h=.93*np.sin(phase*2*np.pi/2.25); hx,hy=slope(h)
nx=nx*(1-body)+hx*body; ny=ny*(1-body)+hy*body; height=height*(1-body)+h*body
for path,phase,pitch in [(EAR,.57*x+.82*y,2.15),(EAR_RING,x+11*np.sin(y/39),2.25),(REAR_EAR,y+8*np.sin(x/35),2.1),
 (TAIL,np.hypot((x-431)*.9,y-228),2.2),(TAIL_RING,y+9*np.sin(x/35),2.15)]:
 region=mask(path); h=.93*np.sin(phase*2*np.pi/pitch); hx,hy=slope(h)
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
active=1-protection; nx*=active; ny*=active; height*=active
normal=np.stack([-nx*.16,ny*.16,np.ones_like(nx)],axis=2); normal/=np.linalg.norm(normal,axis=2,keepdims=True)
rough=.32+.035*body-.025*wave; rough=rough*(1-smooth)+.23*smooth
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
manifest={'card':'sm1-154','source':'https://assets.tcgdex.net/en/sm/sm1/154/high.png','maps':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.glob('*.png')},'method':'Two-view registered photo groove-axis geometry, re-engraved with periodic continuous fields. No photographed brightness becomes height. Body and bars are traced in TCGdex print coordinates.','estimates':'Groove depth, subpixel pitch, obscured triangle boundaries and body continuation are inferred; photographed groove directions guide reconstruction.'}
(OUT/'source.json').write_text(json.dumps(manifest,indent=2)+'\n')
