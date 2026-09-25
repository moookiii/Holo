"""Photo-guided Sylveon 156/131. Geometry is traced in the 600x825 print plane.
Incision spacing and depth are estimates; print luminance is never relief.
"""
from pathlib import Path
import hashlib, json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from umbreon_video_maps import body_texture

ROOT=Path(__file__).resolve().parents[2]
REF=ROOT/'research/prismatic-evolutions/sylveon-156'
OUT=ROOT/'public/cards/pokemon/prismatic-evolutions/maps'
REVIEW=ROOT/'artifacts/sylveon-156'
W,H,S=1800,2475,3

from sylveon_geometry import BODY_PARTS, GEMS

def poly(points):
    im=Image.new('L',(W,H)); ImageDraw.Draw(im).polygon([(round(x*S),round(y*S)) for x,y in points],fill=255)
    return np.asarray(im.filter(ImageFilter.GaussianBlur(.7)),np.float32)/255

def build():
    OUT.mkdir(exist_ok=True); REVIEW.mkdir(parents=True,exist_ok=True)
    yy,xx=np.mgrid[:H,:W].astype(np.float32); x=(xx+.5)/S; y=(yy+.5)/S
    front=Image.open(ROOT/'public/cards/pokemon/prismatic-evolutions/156.png').convert('RGB').resize((W,H))
    rgb=np.asarray(front,np.float32)/255
    # Registered from the user's corrected green boundary, retaining all
    # three ribbon openings. The authored PNG follows the stroke center.
    body=np.asarray(Image.open(ROOT/'scripts/prismatic/sylveon-body-trace.png').convert('L'),np.float32)/255
    gems=np.maximum.reduce([poly(p) for p in GEMS]); body*=1-gems
    silver=np.asarray(Image.open(REF/'silver-microdiamond.png').convert('L').resize((W,H)),np.float32)/255
    # The supplied shared frame fits this printing; ex lettering sits at the same position.
    ex=silver[30*S:70*S,280*S:346*S].copy(); silver[30*S:70*S,280*S:346*S]=0
    silver[30*S:70*S,246*S:312*S]=np.maximum(silver[30*S:70*S,246*S:312*S],ex)
    # Letter whites must be bounded by the printed dark keyline, not pale art.
    white=(rgb.min(2)>.66)&((rgb.max(2)-rgb.min(2))<.17)
    dark=(rgb.max(2)<.26).astype(np.uint8)
    near=cv2.dilate(dark,np.ones((11,11),np.uint8))>0
    zones=np.zeros((H,W),np.float32)
    for a,b,c,d in [(110,28,250,69),(438,27,519,68),(109,77,257,94),
      (188,445,382,478),(497,444,557,478),(43,480,559,505),(43,505,559,529),
      (43,528,239,552),(189,569,301,600),(43,604,559,630),(43,630,559,654),
      (43,654,559,678),(43,677,322,698),
      (30,710,212,735),(367,713,420,735),(29,754,195,799),(17,29,88,48)]:
        zones[b*S:d*S,a*S:c*S]=1
    protection=cv2.dilate((white*near*zones).astype(np.float32),np.ones((3,3),np.uint8))
    # Closed white keylines also enclose opaque black letter faces. Fill each
    # connected glyph independently so the attack names cannot acquire grooves.
    contours,_=cv2.findContours(np.uint8(protection*255),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    glyphs=np.zeros((H,W),np.uint8)
    cv2.drawContours(glyphs,contours,-1,255,cv2.FILLED)
    protection=np.maximum(protection,glyphs.astype(np.float32)/255)
    # Rules and evolution portrait interiors, retaining the supplied silver rims.
    for p in [[(113,99),(548,99),(522,132),(118,132),(104,118)],
       [(27,75),(41,63),(63,61),(82,69),(94,89),(93,115),(78,137),(51,143),(30,134),(19,117),(21,92)],
       [(240,748),(376,749),(352,764),(222,764)],
       [(225,771),(561,771),(563,786),(552,793),(228,793),(217,784)],
       [(392,746),(551,744),(566,757),(570,771),(376,771)]]:
        protection=np.maximum(protection,poly(p)*(1-silver))
    # Energy icons are reflective discs with opaque center symbols.
    for cx,cy,rx in [(58,461,15),(94,461,16),(130,461,16),(58,585,15),(95,585,16),(130,585,16),(548,50,24)]:
        disc=np.clip((rx-np.hypot(x-cx,y-cy))*2,0,1)
        silver=np.maximum(silver,disc)
        protection=np.maximum(protection,disc*cv2.erode(dark,np.ones((2,2),np.uint8)))
    # Broad right-side microdiamond field visible in the supplied photo.
    # Soft edges describe uncertain photographed extent, while the character
    # and glyph cutouts remain exact registered material boundaries.
    right=poly([(412,136),(577,136),(577,596),(537,561),(491,478),
                (474,405),(443,348),(407,291),(395,220)])
    right=cv2.GaussianBlur(right,(0,0),18)*(1-body)*(1-gems)*(1-protection)*.72
    smooth_micro=np.maximum(gems,silver)*(1-protection)
    secondary=np.maximum(smooth_micro,right)
    inner=poly([(23,24),(577,24),(577,801),(23,801)])
    # Curved ribbon/flower relief inferred from the supplied oblique photo.
    # Differentiate continuous fields before applying material boundaries.
    def slope(h):
        gy,gx=np.gradient(h,1/S,1/S); return gx,gy
    phase=.68*x+.35*y+12*np.sin(.011*y-.006*x)+4*np.sin(.020*y+.014*x)
    a=.7*np.sin(phase*2*np.pi/1.45); gx,gy=slope(a); height=a.copy()
    for cx,cy,rx,ry in [(181,190,105,132),(450,420,33,34),(441,530,37,36),
                       (168,581,34,32),(391,604,36,37),(295,653,90,65)]:
        r=np.hypot(x-cx,(y-cy)*rx/ry)
        h=.7*np.sin((r+1.4*np.sin(np.arctan2(y-cy,x-cx)*5))*2*np.pi/1.45)
        hx,hy=slope(h); w=.8*np.exp(-np.power(r/(rx*1.7),4))
        gx=gx*(1-w)+hx*w; gy=gy*(1-w)+hy*w; height=height*(1-w)+h*w
    field_body=body_texture(x,y)*.50
    edge=.50*np.sin((.52*x+.31*y+7*np.sin(.035*y+.014*x))*2*np.pi/1.35)
    ex,ey=slope(edge); gx=gx*inner+ex*(1-inner); gy=gy*inner+ey*(1-inner)
    height=height*inner+edge*(1-inner)
    bx,by=slope(field_body); gx=gx*(1-body)+bx*body; gy=gy*(1-body)+by*body
    height=height*(1-body)+field_body*body
    active=(1-smooth_micro)*(1-protection)
    gx*=active; gy*=active; height*=active
    normal=np.stack([-gx*.065,gy*.065,np.ones_like(gx)],2); normal/=np.linalg.norm(normal,axis=2,keepdims=True)
    rough=(.35+.055*body)*(1-secondary)+.27*secondary
    foil=(.92*inner+.98*(1-inner))*(1-.40*body)
    arrays={'foil':foil,'protection':protection,'height':.5+height*.19,'normal':normal*.5+.5,
      'roughness':rough,'secondary-foil':secondary,'body':body,'gems':gems,'silver':silver,'right-microdiamond':right}
    hashes={}
    for name,data in arrays.items():
        path=OUT/f'156-holo-{name}.png'; Image.fromarray(np.rint(np.clip(data,0,1)*255).astype(np.uint8)).save(path)
        hashes[path.name]=hashlib.sha256(path.read_bytes()).hexdigest()
    for name,mask,color in [('body',body,(255,0,160)),('microdiamond',secondary,(0,255,140)),('protection',protection,(40,80,255))]:
        overlay=rgb*(1-mask[...,None]*.48)+np.array(color)/255*mask[...,None]*.48
        Image.fromarray(np.uint8(np.clip(overlay,0,1)*255)).resize((900,1238)).save(REVIEW/f'{name}-overlay.png')
    evidence=dict(cardId='sv08.5-156',variant='holo',status='photo-guided-reconstruction',rendererReady=True,textured=True,
      mapSize=[W,H],maps=hashes,references=[dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(REF.iterdir())],
      referencePolicy='The user-attached 724671-L.jpg guides etched flow, character coverage and the upper/middle-right microdiamond field. Its supplied temporary path was unavailable; the visible attachment was reviewed directly. Clean local front supplies registration only. User silver microdiamond PNG supplies trim coverage, registered separately for ex lettering. Body contours are smoothed before PNG rasterization.',
      limitations='Incision spacing, depth, hidden line continuation and optical constants are estimates from the supplied views. No brightness or random noise was converted to relief.')
    (OUT/'156-holo-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')

if __name__=='__main__': build()
