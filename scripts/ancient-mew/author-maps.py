"""Register print protection and varied foil silhouettes to the supplied scan.
No brightness-derived height, synthesized glyphs, or repeated sparkle tile.
"""
from pathlib import Path
import json, hashlib
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/cards/ancient-mew'
REVIEW = ROOT / 'artifacts/ancient-mew'
REVIEW.mkdir(exist_ok=True, parents=True)
rgb = np.array(Image.open(OUT/'front.jpeg').convert('RGB'))
h,w = rgb.shape[:2]
hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
# Gold chroma identifies ink rather than white, pink, or cyan foil reflections.
gold = np.uint8((hsv[:,:,0]>8)&(hsv[:,:,0]<39)&(hsv[:,:,1]>65)&(hsv[:,:,2]>85))*255
gold = cv2.morphologyEx(gold,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
count,labels,stats,_ = cv2.connectedComponentsWithStats(gold)
protection = np.zeros((h,w),np.uint8)
for i in range(1,count):
 x,y,bw,bh,area=stats[i]
 small_glyph = y>h*.715 and w*.12<x<w*.88
 if area >= (65 if small_glyph else 220): protection[labels==i]=255
# Solid printed bands are speckled by the photographed foil; protect their
# complete measured outlines rather than punching holes through the ink grain.
sx,sy=w/1344,h/1877
def polygon(points):
 cv2.fillPoly(protection,[np.array([(round(x*sx),round(y*sy)) for x,y in points],np.int32)],255)
def rect(x0,y0,x1,y1):polygon([(x0,y0),(x1,y0),(x1,y1),(x0,y1)])
rect(0,0,1344,76);rect(0,1778,1344,1877);rect(0,0,81,1877);rect(1274,0,1344,1877)
rect(158,251,1198,301);rect(158,301,209,949);rect(1147,301,1198,949);rect(158,897,1198,949)
rect(170,989,1180,1025);rect(170,1298,1180,1333)
polygon([(215,1430),(353,1750),(115,1750)])
polygon([(1008,1425),(1230,1425),(1145,1690)])
polygon([(130,1497),(349,1497),(337,1528),(143,1528)])
polygon([(1015,1638),(1230,1638),(1240,1672),(1002,1672)])
rect(380,1594,974,1623);rect(451,1700,574,1748);rect(774,1700,902,1748)
# Include antialiased ink fringes, without filling glyph counters or Mew's body.
protection = cv2.dilate(protection,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
protection = cv2.GaussianBlur(protection,(3,3),.65)
foil = np.full((h,w),255,np.uint8)
# Physical rounded card outline; source-image corners contain the black support.
outline = np.zeros((h,w),np.uint8)
cv2.rectangle(outline,(55,0),(w-56,h-1),255,-1)
cv2.rectangle(outline,(0,55),(w-1,h-56),255,-1)
for x,y in [(55,55),(w-56,55),(55,h-56),(w-56,h-56)]:cv2.circle(outline,(x,y),55,255,-1)
foil = outline
protection = np.maximum(protection,255-outline)
# Local contrast proposes foil flakes only outside protected printing.
gray = cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)
local = cv2.medianBlur(gray,31)
candidate = np.uint8((gray.astype(float)-local>24)&(gray>88)&(protection<20))*255
candidate = cv2.morphologyEx(candidate,cv2.MORPH_CLOSE,np.ones((2,2),np.uint8))
count,labels,stats,centers = cv2.connectedComponentsWithStats(candidate)
motif = np.zeros_like(gray); entries=[]
for i in range(1,count):
 x,y,bw,bh,area = stats[i]
 if area<4 or area>1900 or bw>70 or bh>70: continue
 region=np.uint8(labels[y:y+bh,x:x+bw]==i)*255
 contours,_=cv2.findContours(region,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 # Keep scan-specific rosettes, stepped flecks, diamonds and irregular disks.
 cv2.drawContours(motif[y:y+bh,x:x+bw],contours,-1,255,cv2.FILLED)
 entries.append({'center':centers[i].tolist(),'bounds':[int(x),int(y),int(bw),int(bh)],'pixels':int(area)})
motif = cv2.GaussianBlur(motif,(3,3),.45)
motif[protection>128]=0
for name,data in [('foil',foil),('protection',protection),('flakes',motif)]:
 Image.fromarray(data).save(OUT/f'{name}.png',optimize=True)
alpha=protection.astype(float)/255*.55
overlay=np.uint8(rgb*(1-alpha[:,:,None])+np.array([0,230,240])*alpha[:,:,None])
Image.fromarray(overlay).save(REVIEW/'print-protection.png')
alpha=motif.astype(float)/255*.7
Image.fromarray(np.uint8(rgb*(1-alpha[:,:,None])+np.array([250,0,255])*alpha[:,:,None])).save(REVIEW/'flake-registration.png')
(ROOT/'scripts/ancient-mew/registration.json').write_text(json.dumps({'size':[w,h],'flakes':entries},indent=2)+'\n',encoding='utf8')
sources={name:{'file':name,'sha256':hashlib.sha256((OUT/name).read_bytes()).hexdigest()} for name in ['front.jpeg','back.jpeg']}
sources['video']={'source':'C:/Users/jpall/Videos/m2-res_854p.mp4','sha256':hashlib.sha256(Path('C:/Users/jpall/Videos/m2-res_854p.mp4').read_bytes()).hexdigest(),'reviewedSeconds':[0,.33,.67,1,1.33,1.67,2,2.33,2.67,15,27]}
(OUT/'sources.json').write_text(json.dumps(sources,indent=2)+'\n',encoding='utf8')
print(f'{len(entries)} registered foil silhouettes; {w} x {h} PNG maps')
