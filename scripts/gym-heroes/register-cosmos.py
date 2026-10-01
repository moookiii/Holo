"""Register visible optical motifs to unchanged TCGdex fronts.

This measures printed dots, NOT height or relief. Local contrast proposes
centers and radii inside existing background coverage. Draw filled, antialiased
circles at those measured locations. Scan noise never defines their perimeter
or punches holes inside a dot; subject protection stays in its separate map.
"""
from pathlib import Path
import json
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw
from skimage.feature import blob_log
from scipy.ndimage import gaussian_filter

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT/'public/cards/pokemon/gym-heroes'
REVIEW = ROOT/'artifacts/gym-heroes-cosmos'
REVIEW.mkdir(parents=True,exist_ok=True)
registration = ROOT/'scripts/gym-heroes/cosmos-registration.json'
saved = {} if '--remeasure' in sys.argv or not registration.exists() else {r['card']:r['motifs'] for r in json.loads(registration.read_text(encoding="utf8"))}
corrections=json.loads((ROOT/'scripts/gym-heroes/cosmos-corrections.json').read_text(encoding='utf8'))
report=[]; tiles=[]
for n in range(1,20):
    key=str(n)
    front=np.array(Image.open(ASSETS/f'{n}.png').convert('RGB').resize((600,825)))
    foil=np.array(Image.open(ASSETS/f'maps/{key}-foil.png').convert('L').resize((600,825)))
    protection=np.array(Image.open(ASSETS/f'maps/{key}-protection.png').convert('L').resize((600,825)))
    allowed=(foil>127)&(protection<180)
    safe=cv2.erode(allowed.astype(np.uint8),np.ones((3,3),np.uint8))>0
    clearance=cv2.distanceTransform(allowed.astype(np.uint8),cv2.DIST_L2,5)
    intensity=np.max(front.astype(np.float32),axis=2)/255
    blobs = [(d['center'][1],d['center'][0],d['radius']/2**.5) for d in saved[key]] if key in saved else blob_log(intensity*allowed,min_sigma=.65,max_sigma=18,num_sigma=40,threshold=.027,overlap=.45)
    correction=corrections.get(key,{})
    additions=correction.get('add',[])
    blobs=[b for b in blobs if not any(np.hypot(b[1]-x,b[0]-y)<t for x,y,t in correction.get('remove',[]))
           and b[2]*2**.5<=correction.get('maxRadius',100)
           and not any(np.hypot(b[1]-x,b[0]-y)<r for x,y,r in additions)]
    blobs += [(y,x,r/2**.5) for x,y,r in additions]
    # A large disk owns its interior. Do not turn scan grain or star tips
    # around its core into a ragged union of satellite circles.
    distinct=[]
    for b in sorted(blobs,key=lambda b:-b[2]):
        if not any(b[2]<a[2]*.5 and np.hypot(b[1]-a[1],b[0]-a[0])<a[2]*2**.5+b[2]*.6 for a in distinct):distinct.append(b)
    blobs=distinct
    mask=np.zeros((1650,1200),np.float32); dots=[]
    derivatives={}
    for cy,cx,sigma in blobs:
        x0,y0=int(round(cx)),int(round(cy))
        manual=any(cx==x and cy==y for x,y,r in additions)
        # Glow along an opaque subject/bolt edge is printed artwork, not a
        # Cosmos disk. Retain reviewed partially occluded disks explicitly.
        if not manual and clearance[y0,x0]<max(3,sigma*2**.5*.75):continue
        if key not in saved and not manual:
            if not safe[y0,x0]:continue
            if sigma not in derivatives:
                derivatives[sigma]=[gaussian_filter(intensity,sigma,order=order) for order in [(0,2),(2,0),(1,1)]]
            xx,yy,xy=[v[y0,x0] for v in derivatives[sigma]]
            eig=np.linalg.eigvalsh([[xx,xy],[xy,yy]])
            if eig[1]>=0 or eig[1]/eig[0]<.22:continue
        radius=float(sigma*2**.5)
        if manual:pixels=int(np.pi*radius*radius)
        elif key in saved:
            sample=next(d for d in saved[key] if d['center']==[cx,cy] and abs(d['radius']-radius)<.001)
            pixels=sample['pixels']
        left=max(0,int(cx-radius*2-2));right=min(600,int(cx+radius*2+3))
        top=max(0,int(cy-radius*2-2));bottom=min(825,int(cy+radius*2+3))
        if key not in saved and not manual:
            gy,gx=np.mgrid[top:bottom,left:right];distance=np.hypot(gx-cx,gy-cy)
            roi=front[top:bottom,left:right].astype(float)
            annulus=(distance>radius*1.55)&(distance<radius*2.1)
            if not annulus.any():continue
            ground=np.median(roi[annulus],axis=0)
            delta=np.max(roi-ground,axis=2)
            peak=float(np.max(delta[distance<max(1,radius*.5)]))
            if peak<25:continue
            pixels=int(((distance<radius*1.3)&(delta>max(12,peak*.32))&allowed[top:bottom,left:right]).sum())
        # Sparse bright specks on a broad printed ray are not a large orb.
        if pixels/(np.pi*radius*radius)<.45:continue
        # Contrast confirms a candidate only; it must never become a cutout.
        # LoG's sqrt(2)*sigma is the measured disk radius in source pixels.
        gy2,gx2=np.mgrid[top*2:bottom*2,left*2:right*2]
        distance2=np.hypot((gx2+.5)/2-(cx+.5),(gy2+.5)/2-(cy+.5))
        disk=np.clip((radius-distance2)*2+.5,0,1)
        region=mask[top*2:bottom*2,left*2:right*2]
        np.maximum(region,disk,out=region)
        dots.append({'center':[round(float(cx),3),round(float(cy),3)],'radius':round(radius,3),'pixels':pixels})
    image=Image.fromarray(np.rint(mask*255).astype(np.uint8))
    image.save(ASSETS/f'maps/{key}-cosmos.png',optimize=True)
    preview=np.array(Image.fromarray(front).resize((1200,1650)))
    contours,_=cv2.findContours((np.array(image)>127).astype(np.uint8),cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(preview,contours,-1,(255,25,180),1)
    Image.fromarray(preview).save(REVIEW/f'{key}-overlay.png')
    tile=Image.fromarray(preview).crop((110,180 if n<15 else 370,1090,870 if n<15 else 930)).resize((392,276))
    ImageDraw.Draw(tile).text((4,4),f'{key}: {len(dots)} dots',fill='white',stroke_width=2,stroke_fill='black');tiles.append(tile)
    print(key,len(dots),flush=True)
    report.append({'card':key,'coordinateSize':[600,825],'motifs':dots})
sheet=Image.new('RGB',(1568,1380))
for i,tile in enumerate(tiles):sheet.paste(tile,(i%4*392,i//4*276))
sheet.save(REVIEW/'contact.png')
registration.write_text(json.dumps(report,separators=(',',':'))+'\n',encoding='utf8')
print([(r['card'],len(r['motifs'])) for r in report])
