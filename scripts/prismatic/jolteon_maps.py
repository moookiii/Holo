"""Photo-guided Jolteon 153/131. Geometry is traced in the 600x825 print plane.
Incision spacing and depth are estimates; print luminance is never relief.
"""
from pathlib import Path
import hashlib, json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from umbreon_video_maps import body_texture

ROOT=Path(__file__).resolve().parents[2]
REF=ROOT/'research/prismatic-evolutions/jolteon-153'
OUT=ROOT/'public/cards/pokemon/prismatic-evolutions/maps'
REVIEW=ROOT/'artifacts/jolteon-153'
W,H,S=1800,2475,3


def poly(points):
    im=Image.new('L',(W,H)); ImageDraw.Draw(im).polygon([(round(x*S),round(y*S)) for x,y in points],fill=255)
    return np.asarray(im.filter(ImageFilter.GaussianBlur(.7)),np.float32)/255

def build():
    OUT.mkdir(exist_ok=True); REVIEW.mkdir(parents=True,exist_ok=True)
    yy,xx=np.mgrid[:H,:W].astype(np.float32); x=(xx+.5)/S; y=(yy+.5)/S
    front=Image.open(ROOT/'public/cards/pokemon/prismatic-evolutions/153.png').convert('RGB').resize((W,H))
    rgb=np.asarray(front,np.float32)/255
    masks=ROOT/'scripts/prismatic/jolteon-153'
    body=np.asarray(Image.open(masks/'body.png'),np.float32)/255
    gems=np.asarray(Image.open(masks/'gems.png'),np.float32)/255
    silver=np.asarray(Image.open(REF/'silver-microdiamond.png').convert('L'),np.float32)/255
    # Register the shared ex mark to Jolteon's printed title.
    ex=silver[30*S:70*S,280*S:346*S].copy(); silver[30*S:70*S,280*S:346*S]=0
    silver[30*S:70*S,239*S:305*S]=np.maximum(silver[30*S:70*S,239*S:305*S],ex)
    # Jolteon has no retreat cost; remove the two shared template symbols.
    silver[710*S:735*S,424*S:469*S]=0
    # Letter whites must be bounded by the printed dark keyline, not pale art.
    white=(rgb.min(2)>.66)&((rgb.max(2)-rgb.min(2))<.17)
    dark=(rgb.max(2)<.26).astype(np.uint8)
    near=cv2.dilate(dark,np.ones((11,11),np.uint8))>0
    zones=np.zeros((H,W),np.float32)
    for a,b,c,d in [(108,27,239,74),(438,27,519,69),(109,77,258,94),
      (188,478,380,512),(516,478,575,512),(43,514,559,540),
      (43,538,559,563),(43,560,282,587),(187,599,300,633),
      (493,599,564,635),(43,636,498,663),
      (30,710,265,738),(367,710,420,738),(29,752,199,800),(17,29,88,48)]:
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
    energies=[(58,494,17),(94,494,17),(58,618,17),(94,618,17),(130,618,17)]
    energy=np.zeros((H,W),np.float32)
    for cx,cy,rx in energies:
        disc=np.clip((rx-np.hypot(x-cx,y-cy))*3,0,1)
        energy=np.maximum(energy,disc)
        protection=np.maximum(protection,disc*cv2.dilate(dark,np.ones((2,2),np.uint8)))
    # Photo shows a diamond field across the bottom-right rays. Its obscured
    # transition is an estimate, feathered without following print brightness.
    right=poly([(351,535),(578,517),(578,709),(407,709),(383,645),(335,586)])
    right=cv2.GaussianBlur(right,(0,0),14)*(1-body)*(1-gems)*(1-protection)*.82
    # The pale diagonal slash is etched foil, not microdiamond material.
    # Clip after feathering the surrounding field to keep this printed edge crisp.
    diagonal_bar=poly([(267,548),(306,570),(578,736),
                       (531,746),(246,565)])
    right*=1-diagonal_bar
    smooth_micro=np.maximum(gems,silver)*(1-protection)*(1-energy)
    secondary=np.maximum(smooth_micro,right)*(1-energy)
    inner=poly([(23,24),(577,24),(577,801),(23,801)])
    # Fine diagonal curves visible behind the outstretched paws and below
    # the body. Spacing/depth and hidden continuation are estimated.
    # Differentiate continuous fields before material clipping.
    def slope(h):
        gy,gx=np.gradient(h,1/S,1/S); return gx,gy
    phase=.52*x+.80*y+8*np.sin(.014*x-.009*y)+3*np.sin(.026*y)
    height=.60*np.sin(phase*2*np.pi/1.45); gx,gy=slope(height)
    # Upper-right grooves bend around the crown rather than following the
    # printed lightning bolts. The lower-left field curves into the burst.
    for cx,cy,rx,ry in [(353,170,175,155),(130,470,175,200)]:
        radius=np.hypot(x-cx,(y-cy)*rx/ry)
        h=.60*np.sin(radius*2*np.pi/1.45)
        hx,hy=slope(h); w=.65*np.exp(-np.power(radius/(rx*1.4),4))
        gx=gx*(1-w)+hx*w; gy=gy*(1-w)+hy*w; height=height*(1-w)+h*w
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
    rough=(.35+.055*body)*(1-secondary)+.27*secondary
    foil=(.92*inner+.98*(1-inner))*(1-.40*body)
    arrays={'foil':foil,'protection':protection,'height':.5+height*.19,'normal':normal*.5+.5,
      'roughness':rough,'secondary-foil':secondary,'body':body,'gems':gems,'silver':silver,'right-microdiamond':right,'energy-discs':energy}
    hashes={}
    for name,data in arrays.items():
        path=OUT/f'153-holo-{name}.png'; Image.fromarray(np.rint(np.clip(data,0,1)*255).astype(np.uint8)).save(path)
        hashes[path.name]=hashlib.sha256(path.read_bytes()).hexdigest()
    for name,mask,color in [('body',body,(255,0,160)),('microdiamond',secondary,(0,255,140)),('protection',protection,(40,80,255))]:
        overlay=rgb*(1-mask[...,None]*.48)+np.array(color)/255*mask[...,None]*.48
        Image.fromarray(np.uint8(np.clip(overlay,0,1)*255)).resize((900,1238)).save(REVIEW/f'{name}-overlay.png')
    evidence=dict(cardId='sv08.5-153',variant='holo',status='photo-guided-reconstruction',rendererReady=True,textured=True,
      mapSize=[W,H],maps=hashes,references=[dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(REF.iterdir())],
      referencePolicy='Exact-card etching-master.jpg guides relief and bottom-right diamond coverage. User colored outlines define body and crystals. Supplied energy crops guide concentric icon relief. Clean front supplies registration only; shared silver mask is registered to title and retreat cost.',
      limitations='Incision spacing, depth, hidden line continuation and optical constants are estimates from the supplied views. No brightness or random noise was converted to relief.')
    (OUT/'153-holo-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')

if __name__=='__main__': build()
