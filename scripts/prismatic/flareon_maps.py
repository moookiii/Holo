"""Photo-guided Flareon 146/131. Geometry is traced in the 600x825 print plane.
Incision spacing and depth are estimates; print luminance is never relief.
"""
from pathlib import Path
import hashlib, json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from umbreon_video_maps import body_texture

ROOT=Path(__file__).resolve().parents[2]
REF=ROOT/'research/prismatic-evolutions/flareon-146'
OUT=ROOT/'public/cards/pokemon/prismatic-evolutions/maps'
REVIEW=ROOT/'artifacts/flareon-146'
W,H,S=1800,2475,3

# Tail, back leg, chest, muzzle and small right paw. Jewel occlusions are
# subtracted after combining the continuous character silhouette.
BODY=[(126,280),(132,264),(140,249),(151,236),(168,225),(187,217),
 (212,214),(235,208),(241,216),(235,232),(241,248),(243,272),
 (255,277),(270,283),(283,288),(293,314),(310,340),(325,359),
 (335,372),(349,377),(368,377),(390,371),(412,358),(421,365),
 (426,380),(437,392),(444,387),(446,400),(452,401),(452,415),
 (460,433),(455,448),(460,457),(463,471),(458,480),(450,485),
 (441,480),(433,489),(422,498),(408,506),(390,512),(374,514),
 (363,526),(353,531),(344,529),(337,517),(326,516),(316,519),
 (304,515),(296,503),(289,493),(276,483),(267,477),(252,470),
 (243,472),(233,477),(220,480),(213,484),(204,488),(192,493),
 (176,495),(170,491),(180,470),(185,452),(190,432),(198,417),
 (209,405),(219,396),(210,410),(197,416),(184,419),(168,417),
 (152,413),(137,403),(124,391),(114,377),(108,362),(106,343),
 (111,318),(118,296)]
GEMS=[
 [(267,137),(288,137),(304,165),(281,171)],
 [(247,295),(274,302),(286,333),(361,330),(366,277),(375,252),
  (382,282),(391,265),(389,298),(418,297),(430,321),(426,343),
  (416,336),(416,356),(399,345),(401,365),(381,348),(383,369),
  (363,354),(362,378),(344,361),(345,380),(324,364),(324,383),
  (305,365),(303,380),(285,359),(279,367),(265,346)],
 [(58,298),(67,282),(78,290),(91,325),(83,349),(73,356),(62,342),(55,317)],
 [(84,301),(98,290),(111,306),(128,340),(121,362),(111,372),(96,361),(83,329)],
 [(65,259),(83,246),(96,250),(108,275),(105,294),(89,309),(76,294),(63,273)],
 [(84,225),(99,220),(114,230),(125,254),(123,278),(113,290),(102,279),(94,252)],
 [(120,222),(132,188),(152,195),(166,215),(169,241),(146,264),(133,255)],
 [(172,186),(185,160),(207,156),(223,164),(235,190),(229,212),(204,222),(181,211)],
 [(238,139),(263,136),(280,149),(281,169),(264,183),(247,180),(237,163)],
 [(308,138),(393,137),(390,156),(374,177),(350,185),(336,197),(318,194),(307,178)],
 [(397,137),(431,137),(435,147),(423,165),(408,160)],
 [(495,149),(511,143),(524,164),(536,201),(532,219),(514,223),(501,205)],
 [(459,191),(472,176),(490,188),(502,214),(506,241),(493,258),(475,257),(463,246),(450,216)],
 [(389,241),(407,213),(426,223),(444,250),(454,274),(443,299),(413,304),(395,291),(381,263)],
 [(280,282),(305,250),(335,246),(353,261),(367,291),(373,315),(345,347),(314,343),(290,325)],
 [(200,292),(219,282),(246,292),(260,310),(267,338),(250,367),(237,375),(213,365),(195,345),(187,319)],
 [(134,304),(145,294),(166,310),(181,334),(189,361),(173,379),(151,373),(136,355),(125,326)],
 # Central green crown bow and its blue links.
 [(242,200),(265,183),(301,167),(309,174),(330,163),(353,166),(359,194),
  (349,219),(326,237),(291,249),(269,244),(257,255),(238,249),(231,227)],
 [(352,191),(371,190),(398,208),(404,224),(391,242),(373,224),(352,216)],
 [(263,248),(270,260),(259,282),(252,293),(226,285),(230,266),(239,246)],
 [(281,229),(294,226),(302,241),(300,256),(287,281),(271,272),(270,251)],
 [(322,235),(337,225),(354,230),(371,249),(375,270),(356,283),(342,260)],
 # Separate crown spikes, stopping at the orange fur line.
 [(254,346),(262,345),(290,373),(300,397),(287,382),(279,380)],
 [(266,342),(277,343),(292,358),(311,399),(298,390)],
 [(288,344),(304,350),(315,369),(319,399),(307,381)],
 [(311,347),(325,343),(340,361),(361,397),(340,380),(332,381)],
 [(335,345),(349,340),(358,354),(365,378),(357,375)],
 [(366,312),(377,292),(385,321),(392,345),(391,362),(379,349),(383,379),(364,362)],
 [(391,300),(404,313),(413,347),(408,374),(398,358),(393,356)],
 [(410,300),(424,316),(430,337),(426,356),(419,338)],
]

def poly(points):
    im=Image.new('L',(W,H)); ImageDraw.Draw(im).polygon([(round(x*S),round(y*S)) for x,y in points],fill=255)
    return np.asarray(im.filter(ImageFilter.GaussianBlur(.7)),np.float32)/255

def build():
    OUT.mkdir(exist_ok=True); REVIEW.mkdir(parents=True,exist_ok=True)
    yy,xx=np.mgrid[:H,:W].astype(np.float32); x=(xx+.5)/S; y=(yy+.5)/S
    front=Image.open(ROOT/'public/cards/pokemon/prismatic-evolutions/146.png').convert('RGB').resize((W,H))
    rgb=np.asarray(front,np.float32)/255
    body=poly(BODY)
    for paw in [[(181,478),(202,486),(219,503),(236,528),(248,540),(239,548),
                 (226,542),(214,528),(197,515),(175,505),(159,490)],
                [(343,505),(367,507),(383,518),(401,534),(419,544),(426,553),
                 (415,563),(397,566),(379,561),(361,549),(349,533)]]:
        body=np.maximum(body,poly(paw))
    gems=np.maximum.reduce([poly(p) for p in GEMS]); body*=1-gems
    silver=np.asarray(Image.open(REF/'silver-microdiamond.png').convert('L').resize((W,H)),np.float32)/255
    # The supplied shared frame fits this printing; ex lettering sits 37px left.
    ex=silver[30*S:70*S,280*S:346*S].copy(); silver[30*S:70*S,280*S:346*S]=0
    silver[30*S:70*S,243*S:309*S]=np.maximum(silver[30*S:70*S,243*S:309*S],ex)
    # Letter whites must be bounded by the printed dark keyline, not pale art.
    white=(rgb.min(2)>.66)&((rgb.max(2)-rgb.min(2))<.17)
    dark=(rgb.max(2)<.26).astype(np.uint8)
    near=cv2.dilate(dark,np.ones((11,11),np.uint8))>0
    zones=np.zeros((H,W),np.float32)
    for a,b,c,d in [(111,28,248,69),(438,27,519,68),(109,77,257,94),
      (190,479,391,512),(504,479,555,510),(42,514,559,536),(43,537,520,562),
      (191,579,318,612),(497,578,557,612),(43,612,492,637),
      (30,710,212,735),(367,713,420,735),(29,754,164,799),(17,29,88,48)]:
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
    for cx,cy,rx in [(58,494,15),(94,494,16),(58,593,15),(95,593,16),(130,593,16),(548,50,24)]:
        disc=np.clip((rx-np.hypot(x-cx,y-cy))*2,0,1)
        silver=np.maximum(silver,disc)
        protection=np.maximum(protection,disc*cv2.erode(dark,np.ones((2,2),np.uint8)))
    secondary=np.maximum(gems,silver)*(1-protection)
    inner=poly([(23,24),(577,24),(577,801),(23,801)])
    # Flow inferred from the master: curved concentric inner cuts, sweeping
    # flame cuts outside. Blend slopes, never differentiate a region boundary.
    radius=np.hypot((x-284)*1.05,(y-335)*.85)
    angle=np.arctan2((y-335)*.85,(x-284)*1.05)
    field=radius+1.1*np.sin(angle*9)
    flame=.42*y+.20*x+10*np.sin(.019*x-.015*y)+5*np.sin(.028*y+.011*x)
    field_body=body_texture(x,y)*.75
    band=np.clip((radius-220)/50,0,1); band=band*band*(3-2*band)
    def slope(h):
        gy,gx=np.gradient(h,1/S,1/S); return gx,gy
    a=.80*np.sin(field*2*np.pi/1.55); b=.72*np.sin(flame*2*np.pi/1.4)
    ax,ay=slope(a); bx,by=slope(b)
    gx=ax*(1-band)+bx*band; gy=ay*(1-band)+by*band
    height=a*(1-band)+b*band
    edge=.50*np.sin((.52*x+.31*y+7*np.sin(.035*y+.014*x))*2*np.pi/1.35)
    ex,ey=slope(edge); gx=gx*inner+ex*(1-inner); gy=gy*inner+ey*(1-inner)
    height=height*inner+edge*(1-inner)
    bx,by=slope(field_body); gx=gx*(1-body)+bx*body; gy=gy*(1-body)+by*body
    height=height*(1-body)+field_body*body
    active=(1-secondary)*(1-protection)
    gx*=active; gy*=active; height*=active
    normal=np.stack([-gx*.065,gy*.065,np.ones_like(gx)],2); normal/=np.linalg.norm(normal,axis=2,keepdims=True)
    rough=(.35+.055*body)*(1-secondary)+.27*secondary
    foil=(.92*inner+.98*(1-inner))*(1-.40*body)
    arrays={'foil':foil,'protection':protection,'height':.5+height*.19,'normal':normal*.5+.5,
      'roughness':rough,'secondary-foil':secondary,'body':body,'gems':gems,'silver':silver}
    hashes={}
    for name,data in arrays.items():
        path=OUT/f'146-holo-{name}.png'; Image.fromarray(np.rint(np.clip(data,0,1)*255).astype(np.uint8)).save(path)
        hashes[path.name]=hashlib.sha256(path.read_bytes()).hexdigest()
    for name,mask,color in [('body',body,(255,0,160)),('microdiamond',secondary,(0,255,140))]:
        overlay=rgb*(1-mask[...,None]*.48)+np.array(color)/255*mask[...,None]*.48
        Image.fromarray(np.uint8(np.clip(overlay,0,1)*255)).save(REVIEW/f'{name}-overlay.png')
    evidence=dict(cardId='sv08.5-146',variant='holo',status='photo-guided-reconstruction',rendererReady=True,textured=True,
      mapSize=[W,H],maps=hashes,references=[dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(REF.iterdir())],
      referencePolicy='Etching master defines groove flow; cutout master defines character coverage. Clean local front supplies registration only. User silver microdiamond PNG supplies trim coverage, registered separately for ex lettering.',
      limitations='Incision spacing, depth, hidden line continuation and optical constants are estimates from the supplied views. No brightness or random noise was converted to relief.')
    (OUT/'146-holo-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')

if __name__=='__main__': build()
