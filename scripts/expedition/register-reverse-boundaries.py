"""Register lower reverse-foil panels to their own printed masters, offline.

The saved per-pixel traces are the authoring source; normal runs only rasterize.
--propose fits the outer edge in a bounded neighborhood for visual review.
Never touches fronts, upper foil, SAM protection or Cosmos placement.
"""
from pathlib import Path
import argparse, hashlib, json, io
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'public/cards/pokemon/expedition'
DATA = Path(__file__).with_name('reverse-boundaries.json')
REVIEW = ROOT / 'artifacts/expedition/reverse-boundaries'
LEGACY = {139:'dual-ball',140:'energy-removal-2',141:'energy-restore',143:'master-ball',146:'pokemon-reversal',147:'power-charge'}
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def paths(n):
    front = ROOT/'public/cards/charizard-expedition-reverse/front.png' if n == 40 else ROOT/f'public/cards/holo-bulk/pokemon/{LEGACY[n]}.png' if n in LEGACY else BASE/f'{n}-reverse.png' if n <= 32 else BASE/f'{n}.png'
    mask = BASE/'maps/40-legacy-reverse.png' if n == 40 else BASE/'maps/trainer-legacy-reverse.png' if n in LEGACY else BASE/f'maps/{n}-reverse.png'
    return front, mask

def seam(image, prior, axis, start, end, radius=22):
    # Pixel transition between inside and outside. Positive yellow change and
    # actual RGB contrast guide the edge; the prior rejects letters/bars.
    rgb = image.astype(np.float32)
    yellow = (rgb[:,:,0]+rgb[:,:,1])*0.5-rgb[:,:,2]
    if axis == 'left':
        rgb, yellow = rgb[:,::-1], yellow[:,::-1]
        prior = 600-np.asarray(prior)
    if axis != 'bottom':
        rgb, yellow = rgb.transpose(1,0,2), yellow.T
    lo=max(1,int(min(prior))-radius);hi=min(rgb.shape[0]-4,int(max(prior))+radius+1)
    candidates = np.arange(lo,hi)
    before = (rgb + np.roll(rgb,1,axis=0) + np.roll(rgb,2,axis=0))/3
    after = (np.roll(rgb,-1,axis=0)+np.roll(rgb,-2,axis=0)+np.roll(rgb,-3,axis=0))/3
    contrast = np.linalg.norm(after-before,axis=2)
    yellow_change = np.maximum(0, np.roll(yellow,-2,axis=0)-np.roll(yellow,1,axis=0))
    score = contrast*.65+yellow_change*.75
    # DP selects one coherent boundary rather than independent bright pixels.
    costs=[]; backs=[]
    for i,j in enumerate(range(start,end)):
        p=prior[i]
        cost = -score[candidates,j]+.24*(candidates-p)**2
        cost[np.abs(candidates-p)>radius]=1e8
        if i:
            options=[]
            for step in range(-9,10):
                shifted=np.roll(costs[-1],step)+abs(step)*2.5+step*step*.18
                if step>0: shifted[:step]=1e8
                if step<0: shifted[step:]=1e8
                options.append(shifted)
            opt=np.array(options); choice=opt.argmin(axis=0)
            backs.append(choice-9); cost += opt.min(axis=0)
        costs.append(cost)
    pos=int(costs[-1].argmin()); out=[pos]
    for back in backs[::-1]:
        pos-=int(back[pos]);out.append(pos)
    result=np.array(out[::-1],dtype=int)+lo+1
    return (600-result if axis=='left' else result).tolist()

def propose():
    REVIEW.mkdir(parents=True,exist_ok=True)
    seeds=DATA.with_name('reverse-boundary-seeds');seeds.mkdir(exist_ok=True)
    rows=json.loads(DATA.read_text()) if DATA.exists() else []
    for n in range(1,160):
        if any(r['cardId']==f'ecard1-{n}' for r in rows): continue
        fp,mp=paths(n)
        front=np.array(Image.open(fp).convert('RGB'))
        old=np.array(Image.open(mp).convert('L').resize((600,825),Image.Resampling.LANCZOS))
        backup=REVIEW/f'{n}-before.png'
        if not backup.exists(): Image.fromarray(old).save(backup)
        else: old=np.array(Image.open(backup))
        active=old>50
        bottom=[]
        for x in range(65,584):
            ys=np.flatnonzero(active[650:790,x]);bottom.append(int(ys[-1]+650) if len(ys) else np.nan)
        valid=np.isfinite(bottom);bottom=np.interp(np.arange(519),np.flatnonzero(valid),np.array(bottom)[valid])
        top=next(y for y in range(430,650) if active[y,300])
        left=[];right=[]
        for y in range(top,735):
            xs=np.flatnonzero(active[y]);left.append(int(xs[0]) if len(xs) else 67);right.append(int(xs[-1]+1) if len(xs) else 585)
        seed=seeds/f'{hashlib.sha256(old.tobytes()).hexdigest()[:16]}.png'
        Image.fromarray(old).save(seed)
        rows.append({'cardId':f'ecard1-{n}', 'front':str(fp.relative_to(ROOT)).replace('\\','/'),
            'frontSha256':sha(fp),'coordinateSize':[600,825],
            'sourceMask':str(mp.relative_to(ROOT)).replace('\\','/'),
            'seed':str(seed.relative_to(ROOT)).replace('\\','/'), 'foilValue':int(np.median(old[500:680,120:500])),
            'bottomX':65,'bottom':seam(front,bottom,'bottom',65,584),
            'sideY':top,'left':seam(front,left,'left',top,735,12),
            'right':seam(front,right,'right',top,735,12),
            'reviewStatus':'proposed'})
        DATA.write_text(json.dumps(rows,separators=(',',':'))+'\n')

def rasterize():
    REVIEW.mkdir(parents=True,exist_ok=True)
    rows=json.loads(DATA.read_text()); evidence=[]
    cards=json.loads((BASE/'catalog.json').read_text())['cards']
    for row in rows:
        n=int(row['cardId'].split('-')[-1]);fp,_=paths(n)
        assert sha(fp)==row['frontSha256']
        out=BASE/f'maps/{n}-reverse.png' if n in LEGACY else paths(n)[1]
        # Preserve upper maps byte-for-pixel; supersample only the lower outline.
        lower=Image.new('L',(2400,3300));draw=ImageDraw.Draw(lower)
        left=np.array(row['left']);right=np.array(row['right']);bottom=np.array(row['bottom'])
        top=row['sideY']
        yy,xx=np.mgrid[top:790,0:600]
        side_index=np.minimum(yy-top,len(left)-1)
        bottom_index=np.clip(xx-row['bottomX'],0,len(bottom)-1)
        region=(xx>=left[side_index])&(xx<right[side_index])&(yy<bottom[bottom_index])
        # Dense pixel traces remain in the exact full-card domain.
        binary=np.zeros((825,600),dtype=np.uint8);binary[top:790]=region*255
        contours,_=cv2.findContours(binary,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
        if contours:
            points=contours[0][:,0,:]
            draw.polygon([(int(x)*4+2,int(y)*4+2) for x,y in points],fill=row['foilValue'])
        seed_image=Image.open(ROOT/row['seed']).convert('L')
        seed=np.array(seed_image.resize((600,825),Image.Resampling.LANCZOS))
        arr=np.array(lower.resize((600,825),Image.Resampling.LANCZOS))
        # Internal moon/divider cutouts on the legacy Charizard remain authored
        # print protection. Only external panel boundaries are registered here.
        hull=np.zeros_like(seed)
        old_contours,_=cv2.findContours((seed>row['foilValue']*.5).astype('uint8'),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
        cv2.drawContours(hull,old_contours,-1,255,cv2.FILLED)
        interior=cv2.erode(hull,np.ones((35,35),np.uint8))>0
        protected_inside=interior&(arr>0)
        arr[protected_inside]=seed[protected_inside]
        arr[:top]=seed[:top]
        # Continue the straight side rails through the lower panel's existing
        # curved artwork/ribbon transition; retain that transition's shape.
        if top==430:
            for y in range(382,430):
                xs=np.flatnonzero(seed[y]>row['foilValue']*.5)
                if len(xs) and 58<=xs[0]<=80:
                    arr[y,min(int(left[0]),int(xs[0])):int(xs[0])+4]=row['foilValue']
                    arr[y,:int(left[0])]=0
                if len(xs) and xs[-1]>570:
                    arr[y,int(xs[-1])-3:max(int(right[0]),int(xs[-1])+1)]=row['foilValue']
                    arr[y,int(right[0]):]=0
        if row.get('category')=='Trainer':
            # Existing legacy masks included the right reader rail and yellow
            # illustration divider above the rules. Register this transition
            # to the same card, without changing its header/name foil.
            arr[418:top,int(right[0]):]=0
            hsv=cv2.cvtColor(np.array(Image.open(fp).convert('RGB')),cv2.COLOR_RGB2HSV)
            yellow=(hsv[:,:,0]>=14)&(hsv[:,:,0]<=39)&(hsv[:,:,1]>=85)&(hsv[:,:,2]>=110)
            arr[418:440][yellow[418:440]]=0
        output_image=Image.fromarray(arr)
        if seed_image.size!=(600,825):
            output_image=lower.resize(seed_image.size,Image.Resampling.LANCZOS)
            output_image.paste(seed_image.crop((0,0,seed_image.width,int(top*seed_image.height/825))),(0,0))
            # Keep the authored internal holes at their original resolution.
            native=np.array(output_image);native_seed=np.array(seed_image)
            inside=np.array(Image.fromarray(interior.astype('uint8')*255).resize(seed_image.size,Image.Resampling.NEAREST))>0
            inside &= native>0
            native[inside]=native_seed[inside];output_image=Image.fromarray(native)
        encoded=io.BytesIO();output_image.save(encoded,format='PNG')
        payload=encoded.getvalue()
        if not out.exists() or out.read_bytes()!=payload:
            pending=out.with_suffix('.pending.png');pending.write_bytes(payload);pending.replace(out)
        front=np.array(Image.open(fp).convert('RGB'));active=arr>row['foilValue']*.5
        edge=active ^ cv2.erode(active.astype('uint8'),np.ones((3,3),np.uint8)).astype(bool)
        overlay=front.copy();overlay[edge]=[0,255,255]
        Image.fromarray(overlay).save(REVIEW/f'{n}-overlay.png')
        Image.fromarray(overlay).crop((50,710,595,790)).resize((1090,160)).save(REVIEW/f'{n}-bottom-2x.png')
        evidence.append({k:row[k] for k in ['cardId','front','frontSha256','coordinateSize','reviewStatus']}|{'mask':str(out.relative_to(ROOT)).replace('\\','/'),'maskSha256':sha(out),'maskSize':list(output_image.size), 'transform':{'crop':None,'offset':[0,0],'flipY':False}})
    for start in range(1,len(rows)+1,18):
        sheet=Image.new('RGB',(1635,630),'#222222');d=ImageDraw.Draw(sheet)
        for i,n in enumerate(range(start,min(start+18,len(rows)+1))):
            x=(i%3)*545;y=(i//3)*105
            d.text((x+4,y+3),f"{n}: {cards[n-1]['name']}",fill='white')
            im=Image.open(REVIEW/f'{n}-overlay.png').crop((50,710,595,790))
            sheet.paste(im,(x,y+20))
        sheet.save(REVIEW/f'bottoms-{start}.png')
    evidence_path=BASE/'reverse-boundary-evidence.json';encoded=json.dumps(evidence,indent=2)+'\n'
    if not evidence_path.exists() or evidence_path.read_text()!=encoded: evidence_path.write_text(encoded)
    print(f'Rasterized {len(rows)} card-specific lower panels and native-resolution boundary overlays.')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--propose',action='store_true');args=parser.parse_args()
    if args.propose: propose()
    rasterize()
