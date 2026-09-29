"""Rasterize supplied contours and register subjects to each original edition.
No front editing, relief inference, or dot cutouts. Outputs are PNG maps.
"""
from pathlib import Path
import json
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'public/cards/pokemon/team-rocket'
REVIEW=ROOT/'artifacts/team-rocket-masks'; REVIEW.mkdir(parents=True,exist_ok=True)
OUT=ASSETS/'maps'; OUT.mkdir(exist_ok=True)
NUMBERS=list(range(1,18))+[83]
# Explicit background gaps enclosed by user strokes.
HOLES={1:[(321,254),(375,244)],8:[(187,289)],15:[(128,236)]}
report=[];tiles=[]
for n in ([int(v) for v in sys.argv[1:]] or NUMBERS):
    path=next((ROOT/'scripts/team-rocket/traces').glob(f'{n}.*'))
    trace=np.array(Image.open(path).convert('RGB').resize((600,825)))
    clean=np.array(Image.open(ASSETS/f'{n}.png').convert('RGB').resize((600,825)))
    color=[255,0,0] if n==12 else [34,177,76]
    distance=np.max(np.abs(trace.astype(int)-color),axis=2)
    # Annotation color only, excluding coincident colors in the original print.
    changed=np.max(np.abs(trace.astype(int)-clean.astype(int)),axis=2)>20
    stroke=np.uint8((distance<65)&changed)*255
    stroke[:90]=0;stroke[610 if n==17 else 465 if n in [15,16] else 426:]=0
    stroke=cv2.morphologyEx(stroke,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    # Charizard's wing exits the print at the top edge; close on that edge.
    if n==4:cv2.line(stroke,(323,96),(386,94),255,4)
    contours,_=cv2.findContours(stroke,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    contours=[c for c in contours if cv2.contourArea(c)>35]
    body=np.zeros((1650,1200),np.uint8)
    cv2.drawContours(body,[c*2 for c in contours],-1,255,cv2.FILLED)
    nested,_=cv2.findContours(stroke,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
    for point in HOLES.get(n,[]):
        candidates=[c for c in nested if cv2.pointPolygonTest(c,point,False)>0]
        if not candidates:raise ValueError((n,point,'Open hole contour'))
        cv2.drawContours(body,[min(candidates,key=cv2.contourArea)*2],-1,0,cv2.FILLED)
    # Additional exposed foil visible in the supplied physical-card reference.
    if n==15:
        for gap in [[(104,301),(116,305),(132,319),(137,345),(129,346),(128,367),(123,353),(111,345),(95,340)],
                    [(535,342),(551,348),(551,367),(528,358)]]:
            cv2.fillPoly(body,[np.array(gap,np.int32)*2],0)
    if n==83:
        # The tail is a narrow loop, not an opaque leaf. Its enclosed area
        # shows the original foil background; retain both printed tail edges.
        tail_gap=[(400,238),(414,219),(438,195),(463,176),(487,161),
                  (506,154),(516,154),(521,158),(520,165),(510,177),
                  (491,192),(466,208),(440,223),(414,239),(403,244)]
        cv2.fillPoly(body,[np.array(tail_gap,np.int32)*2],0)
    body=cv2.erode(body,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
    body=np.array(Image.fromarray(body).filter(ImageFilter.GaussianBlur(.45)))
    if n in [15,16]: vertices=[(56,190),(551,190),(551,459),(56,459)]
    elif n==17:vertices=[(20,113),(580,113),(580,600),(20,600)]
    else:vertices=[(143,96),(535,96),(535,420),(65,420),(65,141),(77,136),(86,143),(98,132),(110,136),(121,120),(132,114),(131,106)]
    window=np.zeros_like(body);cv2.fillPoly(window,[np.array(vertices,np.int32)*2],255)
    if np.count_nonzero(body)>np.count_nonzero(window)*1.1:raise ValueError((n,'Bad contour fill'))
    for edition in ['first-edition','unlimited']:
        target=clean if edition=='first-edition' else np.array(Image.open(ASSETS/f'unlimited/{n}.jpg').convert('RGB').resize((600,825)))
        affine=np.array([[1.,0.,0.],[0.,1.,0.]])
        residual=0.;inliers=0
        if edition=='unlimited':
            # Match printed subject features, never photographed foil dots.
            region=cv2.resize(body,(600,825));region=cv2.erode(region,np.ones((5,5),np.uint8))
            sift=cv2.SIFT_create(5000,contrastThreshold=.012)
            a,da=sift.detectAndCompute(cv2.cvtColor(clean,cv2.COLOR_RGB2GRAY),region)
            b,db=sift.detectAndCompute(cv2.cvtColor(target,cv2.COLOR_RGB2GRAY),None)
            matches=[m for m,k in cv2.BFMatcher().knnMatch(da,db,k=2) if m.distance<.72*k.distance]
            src=np.float32([a[m.queryIdx].pt for m in matches]);dst=np.float32([b[m.trainIdx].pt for m in matches])
            affine,keep=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2.5)
            if affine is None or keep.sum()<6:raise ValueError((n,'Unreliable registration',len(matches)))
            inliers=int(keep.sum());delta=src@affine[:,:2].T+affine[:,2]-dst
            residual=float(np.median(np.linalg.norm(delta[keep.ravel()>0],axis=1)))
        transform=affine.copy();transform[:,2]*=2
        subject=cv2.warpAffine(body,transform,(1200,1650),flags=cv2.INTER_LINEAR)
        win=cv2.warpAffine(window,transform,(1200,1650),flags=cv2.INTER_LINEAR)
        protection=np.maximum(subject,255-win)
        for kind,data in [('foil',win),('protection',protection)]:Image.fromarray(data).save(OUT/f'{n}-{edition}-{kind}.png',optimize=True)
        effective=win.astype(float)/255*(1-protection.astype(float)/255)
        preview=np.array(Image.fromarray(target).resize((1200,1650)),dtype=float)
        overlay=np.uint8(preview*(1-effective[...,None]*.38)+np.array([0,225,255])*effective[...,None]*.38)
        Image.fromarray(overlay).save(REVIEW/f'{n}-{edition}.png')
        tile=Image.fromarray(overlay).resize((240,330));ImageDraw.Draw(tile).text((4,4),f'{n} {edition}',fill='white',stroke_width=2,stroke_fill='black');tiles.append(tile)
        report.append({'number':n,'edition':edition,'affine':affine.tolist(),'medianResidual':residual,'inliers':inliers,'subjectPixels':int((subject>127).sum())})
sheet=Image.new('RGB',(240*6,330*6))
for i,t in enumerate(tiles):sheet.paste(t,(i%6*240,i//6*330))
sheet.save(REVIEW/'contact.png')
registration=ROOT/'scripts/team-rocket/holo-registration.json'
if sys.argv[1:] and registration.exists():
    keys={(r['number'],r['edition']) for r in report}
    report=[r for r in json.loads(registration.read_text()) if (r['number'],r['edition']) not in keys]+report
registration.write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print([(r['number'],r['edition'],round(r['medianResidual'],2)) for r in report])
