"""Photo-guided Leafeon 144/131. Geometry is traced in the 600x825 print plane.
Incision spacing and depth are estimates; print luminance is never relief.
"""
from pathlib import Path
import hashlib, json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from umbreon_video_maps import body_texture

ROOT=Path(__file__).resolve().parents[2]
REF=ROOT/'research/prismatic-evolutions/leafeon-144'
OUT=ROOT/'public/cards/pokemon/prismatic-evolutions/maps'
REVIEW=ROOT/'artifacts/leafeon-144'
W,H,S=1800,2475,3


def poly(points):
    im=Image.new('L',(W,H)); ImageDraw.Draw(im).polygon([(round(x*S),round(y*S)) for x,y in points],fill=255)
    return np.asarray(im.filter(ImageFilter.GaussianBlur(.7)),np.float32)/255

def build():
    OUT.mkdir(exist_ok=True); REVIEW.mkdir(parents=True,exist_ok=True)
    yy,xx=np.mgrid[:H,:W].astype(np.float32); x=(xx+.5)/S; y=(yy+.5)/S
    front=Image.open(ROOT/'public/cards/pokemon/prismatic-evolutions/144.png').convert('RGB').resize((W,H))
    rgb=np.asarray(front,np.float32)/255
    masks=ROOT/'scripts/prismatic/leafeon-144'
    body=np.asarray(Image.open(masks/'body.png'),np.float32)/255
    gems=np.asarray(Image.open(masks/'gems.png'),np.float32)/255
    silver=np.asarray(Image.open(REF/'silver-microdiamond.png').convert('L'),np.float32)/255
    # Register the shared ex mark to Leafeon's printed title.
    ex=silver[30*S:70*S,280*S:346*S].copy(); silver[30*S:70*S,280*S:346*S]=0
    silver[30*S:70*S,252*S:318*S]=np.maximum(silver[30*S:70*S,252*S:318*S],ex)
    # Letter whites must be bounded by the printed dark keyline, not pale art.
    white=(rgb.min(2)>.66)&((rgb.max(2)-rgb.min(2))<.17)
    dark=(rgb.max(2)<.26).astype(np.uint8)
    near=cv2.dilate(dark,np.ones((11,11),np.uint8))>0
    zones=np.zeros((H,W),np.float32)
    for a,b,c,d in [(111,27,252,74),(438,27,519,69),(109,77,258,94),
      (185,478,384,513),(512,478,571,513),(43,514,559,540),(43,539,339,564),
      (187,578,342,610),(503,578,559,611),(43,612,558,641),
      (30,710,265,738),(367,710,420,738),(29,752,213,800),(17,29,88,48)]:
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
    # Energy discs use concentric relief, never the diamond material.
    energies=[(58,494,17),(94,494,17),(58,595,17),(94,595,17),(130,595,17)]
    energy=np.zeros((H,W),np.float32)
    for cx,cy,rx in energies:
        disc=np.clip((rx-np.hypot(x-cx,y-cy))*3,0,1)
        energy=np.maximum(energy,disc)
        protection=np.maximum(protection,disc*cv2.dilate(dark,np.ones((2,2),np.uint8)))
    # No broad microdiamond patch is inferred from the bright photograph.
    # The supplied trim, annotated crystals and individual diamonds define it.
    right=np.zeros((H,W),np.float32)
    smooth_micro=np.maximum(gems,silver)*(1-protection)*(1-energy)
    secondary=np.maximum(smooth_micro,right)*(1-energy)
    inner=poly([(23,24),(577,24),(577,801),(23,801)])
    # Continuous sweeping groove families across the foliage. Their local
    # bends follow leaf clusters resolved in the exact-card photograph.
    # Pitch, depth and hidden continuations remain estimates.
    def slope(h):
        gy,gx=np.gradient(h,1/S,1/S); return gx,gy
    fields=[]
    for cx,cy,stretch,turn in [(80,260,1.1,.4),(110,365,1.3,-.5),
      (178,457,1.1,.3),(444,282,1.1,-.4),(495,391,1.2,.5),
      (432,604,1.1,-.5),(124,631,1.2,.5),(286,691,1.0,.1)]:
        dx=x-cx;dy=y-cy
        u=dx*np.cos(turn)+dy*np.sin(turn)
        v=(-dx*np.sin(turn)+dy*np.cos(turn))*stretch
        fields.append(np.sqrt(u*u+v*v+9))
    distances=np.stack(fields);nearest=distances.min(0)
    phase=nearest-15*np.log(np.exp(-(distances-nearest)/15).sum(0))
    phase+=2*np.sin(.065*x+.02*y)+1.4*np.sin(.055*y)
    height=.92*np.sin(phase*2*np.pi/1.7)
    gx,gy=slope(height);gx*=1.35;gy*=1.35
    field_body=body_texture(x,y)*.50
    edge=.50*np.sin((.52*x+.31*y+7*np.sin(.035*y+.014*x))*2*np.pi/1.35)
    ex,ey=slope(edge); gx=gx*inner+ex*(1-inner); gy=gy*inner+ey*(1-inner)
    height=height*inner+edge*(1-inner)
    bx,by=slope(field_body); gx=gx*(1-body)+bx*body; gy=gy*(1-body)+by*body
    height=height*(1-body)+field_body*body
    # Exactly concentric attack-energy grooves, centered on each icon.
    # Slopes are calculated on each continuous radial field before clipping.
    for cx,cy,rx in energies:
        r=np.hypot(x-cx,y-cy)
        disc=np.clip((rx-r)*3,0,1)
        ring=.55*np.cos(r*2*np.pi/1.25)
        rx_slope,ry_slope=slope(ring)
        gx=gx*(1-disc)+rx_slope*disc; gy=gy*(1-disc)+ry_slope*disc
        height=height*(1-disc)+ring*disc
    active=(1-smooth_micro)*(1-protection)
    gx*=active; gy*=active; height*=active
    normal=np.stack([-gx*.065,gy*.065,np.ones_like(gx)],2); normal/=np.linalg.norm(normal,axis=2,keepdims=True)
    rough=(.30+.105*body)*(1-secondary)+.27*secondary
    foil=(.92*inner+.98*(1-inner))*(1-.40*body)
    arrays={'foil':foil,'protection':protection,'height':.5+height*.19,'normal':normal*.5+.5,
      'roughness':rough,'secondary-foil':secondary,'body':body,'gems':gems,'silver':silver,'right-microdiamond':right,'energy-discs':energy}
    hashes={}
    for name,data in arrays.items():
        path=OUT/f'144-holo-{name}.png'
        pixels=np.rint(np.clip(data,0,1)*255).astype(np.uint8)
        if not path.exists() or not np.array_equal(np.asarray(Image.open(path)),pixels):
            Image.fromarray(pixels).save(path)
        hashes[path.name]=hashlib.sha256(path.read_bytes()).hexdigest()
    for name,mask,color in [('body',body,(255,0,160)),('microdiamond',secondary,(0,255,140)),('protection',protection,(40,80,255))]:
        overlay=rgb*(1-mask[...,None]*.48)+np.array(color)/255*mask[...,None]*.48
        Image.fromarray(np.uint8(np.clip(overlay,0,1)*255)).resize((900,1238)).save(REVIEW/f'{name}-overlay.png')
    evidence=dict(cardId='sv08.5-144',variant='holo',status='photo-guided-reconstruction',rendererReady=True,textured=True,
      mapSize=[W,H],maps=hashes,references=[dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(REF.iterdir())],
      referencePolicy='Exact-card etching-master.jpg guides curved foliage relief; the complementary body photograph resolves character coverage. User red outlines define crystals; body curves are traced against the clean front and checked against the body photograph. Concentric icon relief follows the established attack-energy treatment. Clean front supplies registration only; shared silver mask is registered to title and retreat cost.',
      reliefMethod='Local photo-guided flowing contour families joined through a smooth distance field, differentiated before clipping; relief covers the foliage around the body and through the lower card. Crystal boundaries follow the supplied red outline; body contours follow the clean print and reference photo; five concentric attack-energy fields are centered on the print.',
      limitations='Incision spacing, depth, hidden line continuation and optical constants are estimates from the supplied views. No brightness or random noise was converted to relief.')
    (OUT/'144-holo-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')

if __name__=='__main__': build()
