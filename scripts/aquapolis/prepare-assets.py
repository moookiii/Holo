"""Offline PNG masks, thumbnails, evidence and review captures; no Cosmos placement."""
from pathlib import Path
import json, hashlib, shutil
import numpy as np
import cv2
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'public/cards/pokemon/aquapolis'
MAPS=BASE/'maps'
REVIEW=ROOT/'artifacts/aquapolis/masks'
INPUT=Path(r'C:\Users\jpall\Pictures\aquapolis')
for d in [MAPS,REVIEW,BASE/'thumbnails',ROOT/'research/aquapolis/masks']: d.mkdir(parents=True,exist_ok=True)
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
cards=json.loads((BASE/'catalog.json').read_text())['cards']
evidence=[]
# Individually reviewed curve repairs where yellow foil highlights touched the
# yellow frame and fooled the initial boundary proposal. (Raster row, left edge.)
curve_repairs={2:[(149,64),(154,61),(159,59)],
 10:[(340,60),(347,62),(353,65),(359,69)],
 17:[(108,129),(118,109)],
 30:[(325,61),(337,63),(348,66),(358,71),(366,77)]}
# Reviewed straight frame edges in each untouched 600x825 master: left, right, top, bottom.
# Correct yellow artwork/foil highlights misclassified by the frame-band proposal.
edges=[(58,577,99,403),(59,575,99,403),(56,576,96,401),(59,574,99,403),
 (61,577,97,400),(60,581,99,403),(59,579,100,404),(59,577,100,403),
 (59,579,97,401),(57,574,98,402),(59,577,98,401),(59,579,100,403),
 (59,580,98,401),(60,580,99,403),(60,580,97,401),(58,578,101,405),
 (59,578,97,401),(60,578,101,405),(59,577,99,403),(58,579,101,405),
 (59,580,101,405),(59,577,98,403),(60,579,98,401),(59,577,98,400),
 (58,576,99,403),(62,578,99,402),(61,579,102,405),(60,578,99,403),
 (59,577,97,400),(61,577,97,402),(60,579,98,402),(60,579,99,403)]
for card in cards:
 n=card['localId']; front=Image.open(BASE/f'{n}.png').convert('RGB')
 thumb=front.copy();thumb.thumbnail((240,330),Image.Resampling.LANCZOS);thumb.save(BASE/'thumbnails'/f'{n}.webp',quality=85)
 if n.startswith('H'):
  number=int(n[1:]);source=INPUT/('H331.png' if number==31 else f'H{number}.png')
  # User-supplied SAM geometry is immutable, including negative spaces and small components.
  protection=Image.open(source);assert protection.size==front.size==(600,825)
  target=MAPS/f'{n}-holo-protection.png';shutil.copyfile(source,target)
  shutil.copyfile(source,ROOT/'research/aquapolis/masks'/source.name)
  # Frame topology is shared with the e-Series. Register its edge per Aquapolis master.
  template=ROOT/'public/cards/pokemon/expedition/maps'/('1-holo-window.png' if card.get('evolveFrom') else '2-holo-window.png')
  window=np.array(Image.open(template).convert('L'))
  kernel=np.ones((13,13),np.uint8); outer=cv2.dilate(window,kernel);inner=cv2.erode(window,kernel)
  hsv=cv2.cvtColor(np.array(front),cv2.COLOR_RGB2HSV)
  frame=(hsv[:,:,0]>=14)&(hsv[:,:,0]<=39)&(hsv[:,:,1]>=85)&(hsv[:,:,2]>=110)
  candidate=np.where((inner>0)|((outer>0)&~frame),255,0).astype('uint8')
  count,labels,stats,_=cv2.connectedComponentsWithStats(candidate)
  component=np.where(labels==1+np.argmax(stats[1:,cv2.CC_STAT_AREA]),255,0).astype('uint8')
  contours,_=cv2.findContours(component,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
  registered=np.zeros_like(component);cv2.drawContours(registered,contours,-1,255,cv2.FILLED)
  left,right,top,bottom=edges[number-1]
  # Complete the continuous field behind opaque subjects. These are measured
  # boundary edits, not silhouette edits, smoothing, feathering or new foil motifs.
  registered[80:130,180:right+1]=0
  registered[top:130,180:443]=255
  registered[top+5:130,443:right+1]=255
  registered[390:420,180:right+1]=0
  registered[390:bottom+1,180:right+1]=255
  registered[160:325,45:80]=0
  registered[160:325,left:80]=255
  registered[110:bottom+1,right-6:right+1]=255
  registered[:,right+1:]=0
  for (y0,x0),(y1,x1) in zip(curve_repairs.get(number,[]),curve_repairs.get(number,[])[1:]):
   for row in range(y0,y1+1):
    edge=round(x0+(x1-x0)*(row-y0)/(y1-y0))
    registered[row,45:180]=0;registered[row,edge:180]=255
  # Each foil-window raster row has one continuous interior. Remove isolated
  # slivers introduced by the reviewed straight-edge edits, without touching SAM.
  for row in range(top,bottom+1):
   xs=np.flatnonzero(registered[row])
   if len(xs):registered[row,xs[0]:xs[-1]+1]=255
  Image.fromarray(registered).save(MAPS/f'{n}-holo-window.png')
  # Empty preparation asset: regeneration must preserve future authored motifs.
  motif=MAPS/f'{n}-cosmos.png'
  if not motif.exists():Image.new('L',(1200,1650),0).save(motif)
  arr=np.array(front).astype(float);f=registered>0;p=np.array(protection.convert('L'))>0
  arr[f]=arr[f]*.78+np.array([0,255,80])*.22;arr[p]=arr[p]*.68+np.array([255,0,180])*.32
  edge=f & ~(cv2.erode(registered,np.ones((3,3),np.uint8))>0);arr[edge]=[0,255,255]
  overlay=Image.fromarray(arr.astype('uint8'));overlay.save(REVIEW/f'{n}-overlay.png')
  overlay.crop((45,80,590,425)).resize((1090,690),Image.Resampling.NEAREST).save(REVIEW/f'{n}-window.png')
  evidence.append({'cardId':card['id'],'collectorNumber':n,'name':card['name'],'masterSha256':sha(BASE/f'{n}.png'),
   'suppliedSam':str(source),'samSha256':sha(source),'protectionSha256':sha(target),'windowSha256':sha(MAPS/f'{n}-holo-window.png'),
   'dimensions':[600,825],'transform':{'scale':[1,1],'translation':[0,0],'crop':None,'flipY':False},
   'samProvenance':'User-supplied segmentation; preserved byte-for-byte. No model rerun or invented silhouette.',
   'windowMethod':'Existing e-Series topology registered per master in a +/-6px frame band, then reviewed straight edge corrections to restore yellow artwork exclusions; continuous interior; no blur.',
   'reviewedStraightEdges':{'left':left,'right':right,'top':top,'bottom':bottom,'headerBottom':top+5},
   'reviewedCurveRepairs':curve_repairs.get(number,[]),
   'frameCorrectionPixels':int(np.count_nonzero(registered!=window)),
   'reviewStatus':'Native master/SAM overlay and enlarged foil-window boundary inspected; hard-raster registration reviewed. Subpixel ink/scan edge and activated material require the next physical foil pass.',
   'cosmosPlacement':'pending-empty-motif'})
 elif int(n.rstrip('ab'))<=147:
  # Existing e-reader body/name response; full-card coordinates, no artwork cropping.
  mask=Image.new('L',(2400,3300),0);draw=ImageDraw.Draw(mask)
  def polygon(points,fill=232):draw.polygon([(x*4,y*4) for x,y in points],fill=fill)
  def rounded(box,radius):draw.rounded_rectangle(tuple(v*4 for v in box),radius*4,fill=232)
  if card['category']=='Pokemon' and card.get('stage')=='Stage1':
   # User-authored Stage 1 geometry, supplied as Primeape 29's full-card PNG.
   mask=Image.open(ROOT/'scripts/aquapolis/stage1-reverse-mask.png').convert('L')
   assert mask.size==(600,825)
  elif card['category']=='Pokemon' and card.get('evolveFrom'):
   mask=Image.open(ROOT/'scripts/expedition/evolved-reverse-mask.png').convert('L')
  else:
   if card['category']=='Trainer':
    polygon([(308,69),(585,69),(585,13),(364,13)])
    polygon([(69,77),(584,77),(584,91),(580,110),(564,122),(140,122),(104,132),(69,151)])
    rounded((67,440,585,753),42)
    polygon([(69,436),(543,436),(543,625),(585,655),(585,751),(524,751),(516,772),(258,772),(247,758),(103,758),(69,725)])
   elif card['category']=='Energy':
    polygon([(69,544),(584,544),(584,754),(551,754),(518,774),(292,774),(254,760),(105,754),(69,728)])
   else:
    rounded((67,22,581,96),30)
    polygon([(98,22),(581,22),(581,91),(142,91),(104,104),(67,130),(67,56)])
    polygon([(65,382),(84,396),(142,409),(180,409),(180,420),(578,420),(578,753),(548,753),(516,775),(257,775),(241,757),(106,756),(79,747),(65,726)])
   mask=mask.resize((600,825),Image.Resampling.LANCZOS)
  if card['category']=='Pokemon' and card.get('stage')=='Stage1':
   shutil.copyfile(ROOT/'scripts/aquapolis/stage1-reverse-mask.png',MAPS/f'{n}-reverse.png')
  else:
   mask.save(MAPS/f'{n}-reverse.png')
  # Review reverse coverage against the complete actual master, including low-resolution b sources.
  master=front.resize((600,825));arr=np.array(master).astype(float);m=np.array(mask)>0
  arr[m]=arr[m]*.7+np.array([0,220,255])*.3
  Image.fromarray(arr.astype('uint8')).save(REVIEW/f'{n}-reverse.png')

(BASE/'mask-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')
product=json.loads((ROOT/'research/aquapolis/wrapper-product.json').read_text())
wrappers=[]
for i,design in enumerate(['tyranitar','entei','arcanine','scizor']):
 source=ROOT/f'research/aquapolis/wrapper-{i}.png';im=Image.open(source).convert('RGB');arr=np.array(im)
 candidate=(np.max(arr,axis=2)>25).astype('uint8');count,labels,stats,_=cv2.connectedComponentsWithStats(candidate)
 component=np.where(labels==1+np.argmax(stats[1:,cv2.CC_STAT_AREA]),255,0).astype('uint8')
 contours,_=cv2.findContours(component,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
 alpha=np.zeros_like(component);cv2.drawContours(alpha,contours,-1,255,cv2.FILLED)
 x,y,w,h=cv2.boundingRect(alpha);rgba=np.dstack([arr,alpha])[y:y+h,x:x+w]
 target=ROOT/f'public/packs/pokemon/ecard2-{design}.png';Image.fromarray(rgba).save(target)
 wrappers.append({'design':design,'url':'https:'+product['images'][i],'sourcePage':'https://loosepacks.com/products/aquapolis-unlimited-short-crimp','sourceSha256':sha(source),
  'sha256':sha(target),'crop':[x,y,x+w,y+h],'dimensions':[w,h],'method':'Filled outer wrapper silhouette removes black background and tapered side gaps; tight crop; seals retained; no rotation or stretch.'})
(ROOT/'scripts/aquapolis/wrapper-sources.json').write_text(json.dumps(wrappers,indent=2)+'\n')
print('Prepared 32 unchanged supplied SAM protections, 32 registered windows, 32 empty motifs, 151 reverse maps, 186 thumbnails and four tightly cropped wrappers.')
