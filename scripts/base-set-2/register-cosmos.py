"""Register visible optical motifs to unchanged TCGdex fronts.

This measures printed dots, NOT height or relief. Local contrast proposes
islands inside existing background coverage; PNG review overlays expose every
accepted outline. Retain scanned circle irregularity and gaps rather than
substituting ideal circles or distributing motifs procedurally.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw
from skimage.feature import blob_log
from scipy.ndimage import gaussian_filter

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT/'public/cards/pokemon/base-set-2'
REVIEW = ROOT/'artifacts/base-set-2/cosmos-registration'
REVIEW.mkdir(parents=True,exist_ok=True)
report=[]; tiles=[]
for n in range(1,21):
    front=np.array(Image.open(ASSETS/f'{n}.png').convert('RGB'))
    foil=np.array(Image.open(ASSETS/f'maps/{n}-foil.png').convert('L').resize((600,825)))
    protection=np.array(Image.open(ASSETS/f'maps/{n}-protection.png').convert('L').resize((600,825)))
    allowed=(foil>127)&(protection<180)
    safe=cv2.erode(allowed.astype(np.uint8),np.ones((3,3),np.uint8))>0
    intensity=np.max(front.astype(np.float32),axis=2)/255
    blobs=blob_log(intensity,min_sigma=.65,max_sigma=9,num_sigma=22,threshold=.027,overlap=.45)
    mask=np.zeros((825,600),np.uint8); dots=[]
    derivatives={}
    for cy,cx,sigma in blobs:
        x0,y0=int(round(cx)),int(round(cy))
        if not safe[y0,x0]:continue
        if sigma not in derivatives:
            derivatives[sigma]=[gaussian_filter(intensity,sigma,order=order) for order in [(0,2),(2,0),(1,1)]]
        xx,yy,xy=[v[y0,x0] for v in derivatives[sigma]]
        eig=np.linalg.eigvalsh([[xx,xy],[xy,yy]])
        if eig[1]>=0 or eig[1]/eig[0]<.22:continue
        radius=float(sigma*2**.5)
        left=max(0,int(cx-radius*2-2));right=min(600,int(cx+radius*2+3))
        top=max(0,int(cy-radius*2-2));bottom=min(825,int(cy+radius*2+3))
        gy,gx=np.mgrid[top:bottom,left:right];distance=np.hypot(gx-cx,gy-cy)
        roi=front[top:bottom,left:right].astype(float)
        annulus=(distance>radius*1.55)&(distance<radius*2.1)
        if not annulus.any():continue
        ground=np.median(roi[annulus],axis=0)
        delta=np.max(roi-ground,axis=2)
        peak=float(np.max(delta[distance<max(1,radius*.5)]))
        if peak<25:continue
        shape=(distance<radius*1.3)&(delta>max(12,peak*.32))&allowed[top:bottom,left:right]
        if shape.sum()<2:continue
        mask[top:bottom,left:right][shape]=255
        dots.append({'center':[round(float(cx),3),round(float(cy),3)],'radius':round(radius,3),'pixels':int(shape.sum())})
    # Preserve measured perimeters, with subpixel antialiasing at delivery size.
    image=Image.fromarray(mask).resize((1200,1650),Image.Resampling.LANCZOS)
    image.save(ASSETS/f'maps/{n}-cosmos.png',optimize=True)
    preview=np.array(Image.fromarray(front).resize((1200,1650)))
    contours,_=cv2.findContours((np.array(image)>127).astype(np.uint8),cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(preview,contours,-1,(255,25,180),1)
    Image.fromarray(preview).save(REVIEW/f'{n}-overlay.png')
    tile=Image.fromarray(preview).crop((110,180,1090,870)).resize((392,276))
    ImageDraw.Draw(tile).text((4,4),f'{n}: {len(dots)} motifs',fill='white',stroke_width=2,stroke_fill='black');tiles.append(tile)
    report.append({'card':f'base4-{n}','coordinateSize':[600,825],'motifs':dots})
sheet=Image.new('RGB',(1568,1380))
for i,tile in enumerate(tiles):sheet.paste(tile,(i%4*392,i//4*276))
sheet.save(REVIEW/'contact.png')
(ROOT/'scripts/base-set-2/cosmos-registration.json').write_text(json.dumps(report,separators=(',',':'))+'\n',encoding='utf8')
print([(r['card'],len(r['motifs'])) for r in report])
