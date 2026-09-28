import json, cv2
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[2]
out=root/'artifacts/base-set-2/masks';out.mkdir(parents=True,exist_ok=True)
sources=json.loads((root/'scripts/base-set-2/mask-sources.json').read_text())
base=['alakazam','blastoise','chansey','charizard','clefairy','gyarados','hitmonchan','machamp','magneton','mewtwo','nidoking','ninetales','poliwrath','raichu','venusaur','zapdos']
report=[];tiles=[]
for n,source in sources.items():
 setid,number=source.split('-');number=int(number)
 if setid=='base1':
  directory=root/'public/cards'/('charizard-base-set' if number==4 else 'pokemon/base-set/'+base[number-1])
  front=directory/'front.png';foil=directory/'foil.png'
 else:
  directory=root/'public/cards/pokemon/jungle';front=directory/f'{number}.png';foil=directory/f'maps/{number}-foil.png'
 a=np.array(Image.open(front).convert('RGB').resize((600,825)))
 b=np.array(Image.open(root/f'public/cards/pokemon/base-set-2/{n}.png').convert('RGB').resize((600,825)))
 mask=np.zeros((825,600),np.uint8);mask[110:410,75:525]=255
 sift=cv2.SIFT_create();ka,da=sift.detectAndCompute(cv2.cvtColor(a,cv2.COLOR_RGB2GRAY),mask);kb,db=sift.detectAndCompute(cv2.cvtColor(b,cv2.COLOR_RGB2GRAY),mask)
 matches=[m for m,k in cv2.BFMatcher().knnMatch(da,db,k=2) if m.distance<.70*k.distance]
 pa=np.float32([ka[m.queryIdx].pt for m in matches]);pb=np.float32([kb[m.trainIdx].pt for m in matches])
 M,valid=cv2.estimateAffinePartial2D(pa,pb,method=cv2.RANSAC,ransacReprojThreshold=1.5)
 err=np.linalg.norm(pa-pb,axis=1);inliers=valid.ravel()>0
 f=np.array(Image.open(foil).convert('L').resize((600,825)))
 if setid=='base2':
  protection=np.array(Image.open(directory/f'maps/{number}-protection.png').convert('L').resize((600,825)))
  f=np.uint8(f.astype(float)*(1-protection.astype(float)/255))
 contours,_=cv2.findContours((f>127).astype(np.uint8),cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
 overlay=b.copy();cv2.drawContours(overlay,contours,-1,(255,30,220),1)
 Image.fromarray(overlay).resize((1200,1650)).save(out/f'{n}-overlay.png')
 tile=Image.fromarray(overlay[90:435,55:545]).resize((392,276));ImageDraw.Draw(tile).text((4,4),f'{n} from {source}',fill='white',stroke_width=2,stroke_fill='black');tiles.append(tile)
 report.append(dict(number=n,source=source,matches=len(matches),inliers=int(inliers.sum()),identityMedianPixels=float(np.median(err[inliers])),registeredMedianPixels=float(np.median(np.linalg.norm(cv2.transform(pa[None],M)[0]-pb,axis=1)[inliers])),affine=M.tolist()))
sheet=Image.new('RGB',(392*4,276*5))
for i,tile in enumerate(tiles):sheet.paste(tile,(i%4*392,i//4*276))
sheet.save(out/'contact.png');(out/'registration.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
