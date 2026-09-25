"""Glaceon 150/131: photo-guided ice etching and registered material cutouts.
Line continuation, pitch and depth are geometric estimates from supplied views.
"""
from pathlib import Path
import hashlib, json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from umbreon_video_maps import body_texture

ROOT=Path(__file__).resolve().parents[2]
REF=ROOT/'research/prismatic-evolutions/glaceon-150'
OUT=ROOT/'public/cards/pokemon/prismatic-evolutions/maps'
REVIEW=ROOT/'artifacts/glaceon-150'
W,H,S=1800,2475,3
BODY=[(267,327),(288,325),(310,316),(327,309),(342,305),(352,307),
 (362,313),(369,326),(358,336),
 (363,352),(369,372),(373,393),(373,413),(365,433),(359,445),
 (363,461),(369,470),(386,476),(397,483),(403,490),(405,499),
 (406,510),(409,520),(409,529),(394,530),(389,525),(387,517),
 (384,509),(380,502),(373,498),(362,494),
 (353,510),(343,522),
 (349,534),(361,543),(372,554),(379,562),(380,570),(373,575),
 (360,573),(342,569),(324,574),(309,581),(297,583),(288,579),
 (281,566),(276,559),(267,552),(260,558),(253,562),(247,560),
 (242,552),(240,545),(232,547),(225,546),(217,543),(210,539),(204,535),
 (195,525),(193,517),(192,507),(193,497),(194,486),(197,475),
 (204,463),(212,452),(222,441),(233,431),(247,421),(261,413),
 (275,405),(288,397),(301,388),(311,380),(317,370),(319,366),
 (313,369),(306,369),(301,367),(292,364),(283,362),(279,358),(277,351),
 (276,344),(272,337)]
APPENDAGES=[
 [(260,330),(274,329),(270,344),(258,359),(242,370),(221,383),
  (209,397),(201,411),(174,420),(172,415),(178,386),(182,376),
  (194,368),(213,362),(237,353),(251,343)],
 [(338,305),(350,310),(360,317),(373,323),(386,328),(400,334),
  (413,341),(425,350),(436,362),(445,377),(452,390),
  (453,407),(453,420),(439,414),(420,407),(416,396),
  (413,383),(408,372),(402,363),(394,357),(384,351),(373,346),
  (363,341),(356,336),(351,329),(346,320)],
 [(345,283),(354,265),(373,241),(398,237),(437,238),(464,241),
  (469,244),(450,263),(432,282),(416,296),(392,299),(365,299)],
 [(344,287),(350,286),(357,289),(364,295),(365,299),(370,299),(370,311),(370,319),
  (368,321),(357,313),(348,305)],
 [(201,547),(210,553),(219,572),(226,591),(237,615),(253,636),
  (278,653),(304,661),(321,678),(336,697),(347,709),(343,715),
  (323,720),(300,725),(276,724),(255,716),(241,701),(224,677),
  (209,650),(198,623),(191,596),(191,574),(196,557)],
 # Small printed bridge between the haunch and the tail, partly under text.
 [(200,538),(207,537),(215,541),(215,548),(208,554),(200,552),(198,547)],
]
# Registered from the user's red removal annotation (card offset 22,268;
# displayed at 1.5 times the clean front). These are background openings.
BODY_EXCLUSIONS=[
 [(332,469.3),(326,469.3),(319.3,473.3),(310,486.7),(310.7,490),
  (318,492.7),(322.7,499.3),(321.3,521.3),(316,540.7),(310.7,548.7),
  (312,552),(328,546.7),(361.3,544),(361.3,541.3),(352,532),
  (348,524.7),(348.7,519.3),(353.3,512),(352.7,508.7),(354.7,504.7),
  (359.3,500.7),(359.3,498),(350.7,495.3),(342,488),(335.3,478)],
 [(273.3,339.3),(273.3,344.7),(275.3,346),(278.7,353.3),
  (279.3,360),(282,364),(284.7,364),(279.3,345.3),(276,339.3)],
]
GEMS=[
 [(128,230),(137,227),(146,239),(151,257),(147,276),(138,278),(128,257),(123,241)],
 [(143,244),(155,238),(170,249),(177,269),(173,281),(163,288),(151,281),(142,263)],
 [(136,218),(146,206),(157,212),(167,230),(161,244),(147,243)],
 [(166,199),(181,189),(193,200),(199,216),(190,231),(177,230),(169,218)],
 [(180,164),(199,148),(216,157),(238,159),(249,174),(248,193),(232,203),(211,197),(190,195),(178,183)],
 [(244,163),(266,150),(294,149),(310,161),(309,181),(294,195),(270,205),(249,194)],
 [(216,201),(233,193),(244,201),(241,222),(229,239),(216,228),(212,215)],
 [(280,188),(292,185),(304,197),(312,212),(300,226),(284,214),(276,204)],
 [(307,145),(320,140),(333,155),(330,169),(315,170)],
 [(308,173),(320,167),(337,178),(350,191),(342,203),(329,203),(312,191)],
 [(343,144),(354,135),(366,140),(372,156),(366,173),(354,177),(343,165)],
 [(374,137),(394,136),(405,148),(398,165),(388,178),(377,165)],
 [(402,143),(412,145),(419,162),(425,183),(416,198),(409,188),(404,167)],
 [(394,170),(405,163),(416,178),(419,195),(410,214),(397,216),(388,199),(387,182)],
 [(355,194),(371,188),(384,197),(391,221),(383,239),(361,241),(349,229),(346,212)],
 [(297,220),(315,207),(332,216),(344,234),(341,253),(326,270),(306,267),(294,250),(288,230)],
 [(233,239),(250,223),(267,229),(280,246),(280,264),(261,281),(241,276),(228,258)],
 [(180,245),(194,232),(210,237),(222,255),(225,272),(211,288),(196,286),(181,275),(176,259)],
 # Pale crown stalks behind the jewels, continuous with the colored points.
 [(243,239),(245,213),(253,226),(265,211),(272,232),(273,203),
  (283,225),(296,207),(304,224),(319,228),(326,251),(337,259),
  (344,274),(346,289),(338,311),(325,319),(310,325),(292,330),
  (274,328),(257,320),(249,310),(249,298),(246,286),(240,274),
  (238,263)],
]
DIAMONDS=[(138,400,11,23),(112,290,4,7),(224,296,4,8),(414,450,10,25),
 (450,479,8,21),(129,489,9,21),
 (191,665,10,28),(371,674,9,26),(209,696,5,11)]

def poly(points,blur=.7):
    im=Image.new('L',(W,H)); ImageDraw.Draw(im).polygon([(round(x*S),round(y*S)) for x,y in points],fill=255)
    return np.asarray(im.filter(ImageFilter.GaussianBlur(blur)),np.float32)/255

def build():
    REVIEW.mkdir(parents=True,exist_ok=True)
    yy,xx=np.mgrid[:H,:W].astype(np.float32); x=(xx+.5)/S; y=(yy+.5)/S
    front=Image.open(ROOT/'public/cards/pokemon/prismatic-evolutions/150.png').convert('RGB').resize((W,H))
    rgb=np.asarray(front,np.float32)/255
    gems=np.maximum.reduce([poly(p) for p in GEMS])
    body=np.maximum.reduce([poly(p) for p in [BODY,*APPENDAGES]])*(1-gems)
    body*=1-np.maximum.reduce([poly(p) for p in BODY_EXCLUSIONS])
    for cx,cy,rx,ry in DIAMONDS:
        gems=np.maximum(gems,poly([(cx,cy-ry),(cx+rx,cy),(cx,cy+ry),(cx-rx,cy)]))
    # These printed stars have concave sides and asymmetric tips.
    for points in [
        [(428,526),(426,540),(423,550),(417,557),(423,563),(426,573),
         (428,584),(430,572),(433,563),(439,557),(433,552),(430,541)],
        [(332,588),(330,598),(329,602),(324,607),(328,611),(330,617),
         (332,625),(334,616),(336,612),(340,607),(336,603),(334,597)],
    ]:
        gems=np.maximum(gems,poly(points))
    silver=np.asarray(Image.open(REF/'silver-microdiamond.png').convert('L').resize((W,H)),np.float32)/255
    ex=silver[30*S:72*S,280*S:346*S].copy(); silver[30*S:72*S,280*S:346*S]=0
    silver[30*S:72*S,251*S:317*S]=np.maximum(silver[30*S:72*S,251*S:317*S],ex)
    silver[710*S:734*S,425*S:480*S]=0
    for cx,cy,rx in [(443,724,11),(548,50,25),(58,479,15),(94,479,16),
                     (58,602,15),(94,602,16),(130,602,16)]:
        silver=np.maximum(silver,np.clip((rx-np.hypot(x-cx,y-cy))*2,0,1))
    protection=np.zeros((H,W),np.float32)
    dark=(rgb.max(2)<.28).astype(np.uint8)
    white=(rgb.min(2)>.70)&((rgb.max(2)-rgb.min(2))<.13)
    for a,b,c,d in [(111,28,259,70),(422,30,520,71),(19,29,89,48),
       (110,77,259,94),(190,459,340,494),(504,460,557,494),
       (43,496,558,521),(43,521,558,544),(43,542,242,566),
       (188,583,300,617),(43,618,559,644),(43,642,275,668),
       (29,714,216,736),(367,714,419,735),(27,755,235,800)]:
        region=dark[b*S:d*S,a*S:c*S].copy()
        count,labels,stats,_=cv2.connectedComponentsWithStats(region,8)
        valid=np.zeros_like(region)
        for i in range(1,count):
            sx,sy,sw,sh,area=stats[i]
            if area>=4 and sw<90*S and area<1400*S*S: valid[labels==i]=1
        edge=cv2.dilate(valid,np.ones((9,9),np.uint8))*white[b*S:d*S,a*S:c*S]
        protection[b*S:d*S,a*S:c*S]=np.maximum(valid,edge)
    for p in [[(113,99),(548,99),(522,132),(118,132),(104,118)],
       [(27,75),(41,63),(63,61),(82,69),(94,89),(93,115),(78,137),(51,143),(30,134),(19,117),(21,92)],
       [(240,748),(376,749),(352,764),(222,764)],
       [(225,771),(561,771),(563,786),(552,793),(228,793),(217,784)],
       [(392,746),(551,744),(566,757),(570,771),(376,771)]]:
        protection=np.maximum(protection,poly(p)*(1-silver))
    protection=np.maximum(protection,silver*cv2.erode(dark,np.ones((2,2),np.uint8)))
    protection=cv2.dilate(protection,np.ones((2,2),np.uint8))
    smooth_micro=np.maximum(gems,silver)*(1-protection)
    inner=poly([(23,24),(577,24),(577,801),(23,801)])
    # Dense cuts are visible within the lower-left engraved field. Keep the
    # relief under these microdiamonds; never punch the etching out to add them.
    lower_micro=poly([(23,359),(75,377),(134,445),(182,499),(198,554),
                     (187,610),(223,666),(258,704),(207,749),(23,795)],24)
    lower_micro*=inner*(1-body)*(1-smooth_micro)*(1-protection)*.68
    secondary=np.maximum(smooth_micro,lower_micro)
    def slope(h):
        gy,gx=np.gradient(h,1/S,1/S); return gx,gy
    base=.68*np.sin((.67*x+.73*y+3*np.sin(.024*x-.019*y))*2*np.pi/1.5)
    gx,gy=slope(base); height=base.copy(); total=np.ones_like(x)
    # Scroll-following cuts in the side ornaments. Centers are registered to
    # the clean front; angular curvature is inferred from the angled masters.
    for cx,cy,rx,ry in [(58,177,35,30),(135,166,35,27),(484,167,29,32),
       (546,253,27,30),(53,273,30,29),(53,334,34,34),(526,343,33,32),
       (80,409,35,28),(541,434,34,30),(89,573,33,32),(507,577,36,33),
       (99,678,35,29),(438,686,34,29),(329,603,32,32),(70,750,31,25)]:
        dx=x-cx; dy=(y-cy)*rx/ry; r=np.hypot(dx,dy); angle=np.arctan2(dy,dx)
        field=.72*np.sin((r+1.2*np.sin(3*angle))*2*np.pi/1.5)
        weight=3*np.exp(-np.square(r/(rx*1.3))*2)
        fx,fy=slope(field); gx+=fx*weight; gy+=fy*weight; height+=field*weight; total+=weight
    gx/=total; gy/=total; height/=total
    # Ice-star panels have their own fine directional incisions, clipped only
    # after differentiation so the triangle edges never become raised seams.
    panels=[([(98,273),(189,308),(141,316)],.82,.57),
       ([(35,362),(189,308),(255,362)],.22,.98),
       ([(96,446),(189,308),(255,362)],.93,.36),
       ([(352,341),(499,271),(438,322)],.89,-.45),
       ([(356,343),(558,365),(460,400)],.18,.98),
       ([(359,405),(500,454),(444,442)],.80,.60)]
    for points,dx,dy in panels:
        mask=poly(points,1.4)*(1-body)
        field=.50*np.sin((x*dx+y*dy)*2*np.pi/1.35)
        fx,fy=slope(field); gx=gx*(1-mask)+fx*mask; gy=gy*(1-mask)+fy*mask; height=height*(1-mask)+field*mask
    edge=.50*np.sin((.52*x+.31*y+7*np.sin(.035*y+.014*x))*2*np.pi/1.35)
    ex,ey=slope(edge); gx=gx*inner+ex*(1-inner); gy=gy*inner+ey*(1-inner); height=height*inner+edge*(1-inner)
    grain=body_texture(x,y)*.50; bx,by=slope(grain)
    gx=gx*(1-body)+bx*body; gy=gy*(1-body)+by*body; height=height*(1-body)+grain*body
    active=(1-smooth_micro)*(1-protection); gx*=active; gy*=active; height*=active
    normal=np.stack([-gx*.065,gy*.065,np.ones_like(x)],2); normal/=np.linalg.norm(normal,axis=2,keepdims=True)
    rough=(.36+.06*body)*(1-smooth_micro)+.27*smooth_micro
    foil=(.92*inner+.98*(1-inner))*(1-.43*body)
    arrays={'foil':foil,'protection':protection,'height':.5+height*.19,'normal':normal*.5+.5,
      'roughness':rough,'secondary-foil':secondary,'body':body,'gems':gems,'silver':silver,'etched-microdiamond':lower_micro}
    hashes={}
    for name,data in arrays.items():
        file=OUT/f'150-holo-{name}.png'; Image.fromarray(np.uint8(np.rint(np.clip(data,0,1)*255))).save(file)
        hashes[file.name]=hashlib.sha256(file.read_bytes()).hexdigest()
    for name,mask,color in [('body',body,(255,0,160)),('microdiamond',secondary,(0,255,140)),('protection',protection,(40,80,255))]:
        overlay=rgb*(1-mask[...,None]*.48)+np.array(color)/255*mask[...,None]*.48
        Image.fromarray(np.uint8(np.clip(overlay,0,1)*255)).resize((900,1238)).save(REVIEW/f'{name}-overlay.png')
    evidence=dict(cardId='sv08.5-150',variant='holo',status='photo-guided-reconstruction',rendererReady=True,textured=True,mapSize=[W,H],maps=hashes,
      references=[dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(REF.iterdir())],
      referencePolicy='Two etching masters and crown close-up guide ice-panel/scroll relief, continuous crystal crown and lower-left etched microdiamond. Cutout photo guides body and appendages. User silver mask is registered to ex title and single retreat icon.',
      limitations='Incision pitch/depth, hidden continuation, microdiamond density and the softly bounded lower-left extent are estimates from supplied views. Clean print brightness and noise are never used as relief.')
    (OUT/'150-holo-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')

if __name__=='__main__': build()
