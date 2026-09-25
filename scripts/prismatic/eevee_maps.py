"""Eevee ex 167: registered PNG materials from the user's two etching masters,
cutout photograph, crown close-up and shared silver-trim microdiamond mask.
Geometric incision spacing and depth are estimates, never image luminance.
"""
from pathlib import Path
import hashlib, json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from umbreon_video_maps import body_texture

ROOT=Path(__file__).resolve().parents[2]
REF=ROOT/'research/prismatic-evolutions/eevee-167'
OUT=ROOT/'public/cards/pokemon/prismatic-evolutions/maps'
REVIEW=ROOT/'artifacts/eevee-167'
W,H,S=1800,2475,3

# Traces in the 600x825 clean-print plane; the photos identify which printed
# facets belong to Eevee. Ears, paws and tail remain independent at occlusions.
BODY=[(212,273),(226,274),(245,271),(264,273),(283,280),(300,292),
 (307,309),(308,330),(301,350),(312,359),(319,371),(318,381),
 (328,379),(341,385),(348,399),(356,412),(367,427),(362,441),
 (346,453),(326,461),(310,466),(300,477),(295,490),(298,501),
 (291,509),(283,510),(278,505),(273,491),(270,478),(259,474),
 (247,482),(236,480),(225,469),(216,456),(213,443),(206,433),
 (196,430),(183,419),(175,408),(174,396),(169,389),(171,378),
 (179,363),(188,351),(199,346),(198,333),(195,320),(198,300),(205,284)]
TAIL=[(335,382),(343,364),(353,348),(370,338),(386,332),(405,327),
 (425,326),(446,317),(460,306),(473,288),(479,301),(477,321),
 (484,327),(481,337),(490,337),(485,348),(492,353),(479,364),
 (476,382),(467,399),(452,413),(432,422),(409,429),(388,431),
 (369,423),(353,415),(342,400)]
EARS=[[(164,151),(173,156),(187,179),(199,206),(212,235),(222,268),
       (211,281),(198,258),(184,239),(176,218),(169,196),(163,174)],
      [(314,276),(338,262),(360,256),(383,255),(407,254),(429,256),
       (445,260),(450,267),(437,274),(417,281),(393,286),(368,290),
       (344,294),(321,296)]]
PAWS=[[(214,435),(232,441),(241,455),(247,474),(241,493),(234,504),
       (236,518),(245,530),(251,543),(247,550),(235,553),(223,548),
       (219,534),(215,517),(210,500),(208,480)],
      [(276,453),(294,454),(305,465),(305,481),(298,497),(287,507),
       (282,522),(285,533),(280,541),(269,542),(262,535),(260,520),(265,497)]]
GEMS=[
 [(210,169),(225,151),(233,137),(307,137),(325,150),(317,174),
  (325,195),(332,212),(353,228),(352,245),(331,272),(302,267),
  (277,253),(250,242),(231,239),(211,237)],
 [(77,138),(98,136),(108,151),(103,167),(89,176),(76,170),(70,155)],
 [(101,143),(120,137),(140,146),(142,167),(125,188),(107,184),(96,169)],
 [(124,137),(178,137),(179,150),(164,165),(142,158)],
 [(180,138),(237,137),(235,155),(218,176),(194,170),(178,154)],
 [(250,138),(294,137),(316,156),(313,187),(289,210),(259,205),(241,182),(242,155)],
 [(327,159),(348,149),(368,160),(377,184),(368,207),(347,222),(326,210),(316,187)],
 [(394,192),(415,173),(432,179),(446,199),(442,225),(426,244),(404,242),(387,221)],
 [(456,209),(478,193),(495,198),(505,218),(502,241),(482,265),(460,261),(445,243)],
 [(507,227),(520,217),(530,235),(530,258),(518,277),(506,276),(497,261)],
 [(428,280),(445,272),(456,286),(450,298),(432,301),(420,291)],
 [(460,278),(479,266),(493,275),(497,294),(484,310),(468,305)],
 [(512,274),(525,267),(536,279),(530,297),(516,303),(506,291)],
 # Connected ice-like crown and its pointed colored rim. Crown replaces
 # the underlying ear only inside these crystal boundaries.
 [(202,225),(211,213),(214,191),(224,213),(229,182),(240,205),
  (248,193),(258,212),(275,200),(281,207),(291,187),(300,208),
  (315,197),(315,221),(331,214),(337,223),(355,212),(347,235),
  (368,229),(358,246),(370,239),(359,261),(350,274),(342,299),
  (331,289),(319,300),(308,285),(298,292),(289,277),(278,286),
  (267,271),(257,281),(246,266),(235,274),(228,258),(219,269),
  (211,256),(206,266),(199,250)],
 # Short gemstone link between crown and yellow floating jewel.
 [(346,239),(370,224),(381,226),(370,240),(351,254)],
]
# The supplied close-up also resolves reflective diamond ornaments and eyes.
DIAMONDS=[(103,214,14,24),(183,332,10,19),(75,403,12,24),
 (153,420,11,25),(379,479,15,27),(531,461,12,26),(416,605,11,39),
 (489,184,4,8),(469,178,4,7)]

def poly(points):
    im=Image.new('L',(W,H)); ImageDraw.Draw(im).polygon([(round(x*S),round(y*S)) for x,y in points],fill=255)
    return np.asarray(im.filter(ImageFilter.GaussianBlur(.7)),np.float32)/255

def build():
    REVIEW.mkdir(parents=True,exist_ok=True)
    yy,xx=np.mgrid[:H,:W].astype(np.float32); x=(xx+.5)/S; y=(yy+.5)/S
    front=Image.open(ROOT/'public/cards/pokemon/prismatic-evolutions/167.png').convert('RGB').resize((W,H))
    rgb=np.asarray(front,np.float32)/255
    gems=np.maximum.reduce([poly(p) for p in GEMS])
    body=np.maximum.reduce([poly(p) for p in [BODY,TAIL,*EARS,*PAWS]])*(1-gems)
    raw=np.asarray(Image.open(REF/'silver-microdiamond.png').convert('L').resize((W,H)),np.float32)/255
    silver=raw.copy()
    # Eevee is Basic: no portrait ring, no Stage 1 label, shorter ex title,
    # a full-width horizontal top bar and only one retreat symbol.
    silver[:153*S,:110*S]=0
    silver[25*S:73*S,280*S:346*S]=0
    silver[31*S:71*S,213*S:279*S]=np.maximum(silver[31*S:71*S,213*S:279*S],raw[31*S:71*S,280*S:346*S])
    silver=np.maximum(silver,poly([(23,77),(122,77),(114,84),(23,84)]))
    silver=np.maximum(silver,poly([(24,75),(32,63),(54,50),(76,48),(66,58),(48,71),(45,77)]))
    silver=np.maximum(silver,poly([(17,30),(39,24),(107,24),(93,41),(84,49),(20,49),(13,43)]))
    silver[710*S:734*S,425*S:480*S]=0
    for cx,cy,rx in [(443,724,11),(547,50,25),(58,632,15),(94,632,16),(130,632,16)]:
        silver=np.maximum(silver,np.clip((rx-np.hypot(x-cx,y-cy))*2,0,1))
    for cx,cy,rx,ry in DIAMONDS:
        gems=np.maximum(gems,poly([(cx,cy-ry),(cx+rx,cy),(cx,cy+ry),(cx-rx,cy)]))
    for p in [[(212,306),(220,299),(228,302),(232,313),(226,327),(218,331),(212,325)],
              [(276,316),(282,310),(290,312),(294,323),(289,340),(280,345),(273,338)]]:
        gems=np.maximum(gems,poly(p))
    body*=1-gems
    # Select compact dark glyphs within individually registered text lines.
    # Their white outlines are added locally, avoiding pale flower rectangles.
    protection=np.zeros((H,W),np.float32)
    dark=(rgb.max(2)<.29).astype(np.uint8)
    white=(rgb.min(2)>.70)&((rgb.max(2)-rgb.min(2))<.12)
    for a,b,c,d in [(111,30,219,67),(423,31,519,70),(24,31,88,47),
       (43,482,558,506),(43,506,558,530),(43,530,559,553),(43,553,215,577),
       (190,615,443,650),(499,615,557,649),(29,713,217,736),
       (367,715,418,733),(27,754,164,800)]:
        region=dark[b*S:d*S,a*S:c*S].copy()
        count,labels,stats,_=cv2.connectedComponentsWithStats(region,8)
        valid=np.zeros_like(region)
        for i in range(1,count):
            sx,sy,sw,sh,area=stats[i]
            if area>=4 and sw<95*S and sh<=(d-b)*S and area<1600*S*S:
                valid[labels==i]=1
        edge=cv2.dilate(valid,np.ones((9,9),np.uint8))*white[b*S:d*S,a*S:c*S]
        glyph=np.maximum(valid,edge).astype(np.float32)
        protection[b*S:d*S,a*S:c*S]=np.maximum(protection[b*S:d*S,a*S:c*S],glyph)
    # Red ability name and badge, silver rule borders excluded from panels.
    red=(rgb[:,:,0]>.36)&(rgb[:,:,1]<.24)&(rgb[:,:,2]<.25)
    protection[443*S:476*S,189*S:366*S]=cv2.dilate(red[443*S:476*S,189*S:366*S].astype(np.float32),np.ones((5,5),np.uint8))
    for p in [[(60,447),(177,447),(182,453),(178,464),(166,470),(48,470),(45,462)],
       [(116,99),(548,99),(522,132),(118,132),(105,119)],
       [(240,748),(375,749),(351,764),(222,764)],
       [(225,771),(561,771),(563,786),(552,793),(228,793),(217,784)],
       [(391,747),(551,744),(566,757),(570,771),(376,771)]]:
        protection=np.maximum(protection,poly(p)*(1-silver))
    # Black symbols inside reflective discs remain opaque.
    protection=np.maximum(protection,silver*cv2.erode(dark,np.ones((2,2),np.uint8)))
    protection=cv2.dilate(protection,np.ones((2,2),np.uint8))
    secondary=np.maximum(gems,silver)*(1-protection)
    inner=poly([(23,24),(577,24),(577,801),(23,801)])
    # Flower-following incision fields inferred from both angled views. Their
    # continuous slopes are combined softly; no masked height is differentiated.
    def slope(h):
        gy,gx=np.gradient(h,1/S,1/S); return gx,gy
    base=.63*np.sin((.8*y+.22*x+5*np.sin(.022*x+.014*y))*2*np.pi/1.55)
    gx,gy=slope(base); height=base.copy(); total=np.ones_like(x)
    for cx,cy,rx,ry in [(95,398,75,77),(408,560,97,83),(45,163,57,63),
                         (558,106,69,66),(80,763,83,56),(489,341,65,67)]:
        dx=(x-cx); dy=(y-cy)*rx/ry
        angle=np.arctan2(dy,dx); radius=np.hypot(dx,dy)
        phase=radius+1.3*np.sin(5*angle)
        field=.76*np.sin(phase*2*np.pi/1.50)
        weight=3*np.exp(-np.square(radius/(rx*1.15))*2)
        fx,fy=slope(field); gx+=fx*weight; gy+=fy*weight; height+=field*weight; total+=weight
    gx/=total; gy/=total; height/=total
    edge=.50*np.sin((.52*x+.31*y+7*np.sin(.035*y+.014*x))*2*np.pi/1.35)
    ex,ey=slope(edge); gx=gx*inner+ex*(1-inner); gy=gy*inner+ey*(1-inner); height=height*inner+edge*(1-inner)
    grain=body_texture(x,y)*.68; bx,by=slope(grain)
    gx=gx*(1-body)+bx*body; gy=gy*(1-body)+by*body; height=height*(1-body)+grain*body
    active=(1-secondary)*(1-protection); gx*=active; gy*=active; height*=active
    normal=np.stack([-gx*.065,gy*.065,np.ones_like(x)],2); normal/=np.linalg.norm(normal,axis=2,keepdims=True)
    rough=(.36+.065*body)*(1-secondary)+.27*secondary
    foil=(.91*inner+.98*(1-inner))*(1-.40*body)
    arrays={'foil':foil,'protection':protection,'height':.5+height*.19,'normal':normal*.5+.5,
      'roughness':rough,'secondary-foil':secondary,'body':body,'gems':gems,'silver':silver}
    hashes={}
    for name,data in arrays.items():
        file=OUT/f'167-holo-{name}.png'; Image.fromarray(np.uint8(np.rint(np.clip(data,0,1)*255))).save(file)
        hashes[file.name]=hashlib.sha256(file.read_bytes()).hexdigest()
    for name,mask,color in [('body',body,(255,0,160)),('microdiamond',secondary,(0,255,140)),('protection',protection,(40,80,255))]:
        overlay=rgb*(1-mask[...,None]*.48)+np.array(color)/255*mask[...,None]*.48
        Image.fromarray(np.uint8(np.clip(overlay,0,1)*255)).resize((900,1238)).save(REVIEW/f'{name}-overlay.png')
    evidence=dict(cardId='sv08.5-167',variant='holo',status='photo-guided-reconstruction',rendererReady=True,textured=True,mapSize=[W,H],maps=hashes,
      references=[dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(REF.iterdir())],
      referencePolicy='Two user etching masters guide flower-following lines; the cutout master identifies Eevee. Crown close-up guides continuous microdiamond coverage, eyes and diamond ornaments. Shared user PNG is adapted to Basic trim with one retreat symbol.',
      limitations='Incision spacing, depth, hidden continuation and material constants are estimates from the supplied photos. The clean front is registration only; no brightness or noise is used as height.')
    (OUT/'167-holo-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')

if __name__=='__main__': build()
