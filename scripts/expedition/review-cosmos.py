"""Read-only review aids: compare optical candidates with the printed master.

Large-feature detection is a proposal only. Its contact atlas is navigation;
whole-window raw/overlay images are the actual registration review surface.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, gaussian_laplace, maximum_filter

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT/'public/cards/pokemon/expedition'
OUT = ROOT/'artifacts/expedition/cosmos-redo'
OUT.mkdir(parents=True, exist_ok=True)
report = []
for n in range(1,33):
    front = np.array(Image.open(BASE/f'{n}.png').convert('RGB'))
    donor = np.array(Image.open(BASE/f'{n}-reverse.png').convert('RGB'))
    f = np.array(Image.open(BASE/f'maps/{n}-holo-window.png').convert('L')) > 127
    p = np.array(Image.open(BASE/f'maps/{n}-holo-protection.png').convert('L')) > 180
    allowed = f & ~p
    intensity = front.max(axis=2).astype(np.float32)/255
    printed = donor.max(axis=2).astype(np.float32)/255
    signal = np.maximum(0,intensity-gaussian_filter(intensity,24)
                        -np.maximum(0,printed-gaussian_filter(printed,24)))[90:410,50:590]
    scales = np.linspace(4.5,22,28)
    cube = np.stack([-gaussian_laplace(signal,s)*s*s for s in scales],axis=2)
    peaks = (cube == maximum_filter(cube,size=3)) & (cube > .035) & allowed[90:410,50:590,None]
    y,x,s = np.nonzero(peaks)
    proposals = []
    for i in np.argsort(cube[y,x,s])[::-1]:
        cx,cy,r = int(x[i]+50),int(y[i]+90),float(scales[s[i]]*2**.5)
        if any(np.hypot(cx-a['center'][0],cy-a['center'][1]) < max(r,a['radius'])*1.1 for a in proposals):continue
        proposals.append({'center':[cx,cy],'radius':round(r,2)})
    proposals.sort(key=lambda a:(a['center'][1],a['center'][0]))
    for i,a in enumerate(proposals):a['id']=i
    # Large proposals do not modify site maps.
    raw = Image.fromarray(front).crop((50,90,590,410)).resize((1080,640),Image.Resampling.NEAREST)
    ref = Image.fromarray(donor).crop((50,90,590,410)).resize((1080,640),Image.Resampling.NEAREST)
    raw.save(OUT/f'{n}-raw.png');ref.save(OUT/f'{n}-print.png')
    current=Image.open(ROOT/f'artifacts/expedition/cosmos/{n}-zoom.png')
    pair=Image.new('RGB',(2160,670),'#10151d');pair.paste(raw,(0,30));pair.paste(current,(1080,30))
    ImageDraw.Draw(pair).text((8,8),f'{n}: unmodified master | draft registration',fill='white')
    pair.save(OUT/f'{n}-compare.png')
    marker=raw.copy();draw=ImageDraw.Draw(marker)
    for a in proposals:
        cx,cy=a['center'];r=a['radius'];x2,y2=(cx-50)*2,(cy-90)*2
        draw.ellipse((x2-r*2,y2-r*2,x2+r*2,y2+r*2),outline='#ff00c0',width=1)
        draw.text((x2+2,y2+2),str(a['id']),fill='white',stroke_width=1,stroke_fill='black')
    marker.save(OUT/f'{n}-large-proposals.png')
    sheet=Image.new('RGB',(900, max(1,(len(proposals)+5)//6)*170),'#10151d')
    for i,a in enumerate(proposals):
        cx,cy=a['center'];r=40
        crop=Image.fromarray(front).crop((cx-r,cy-r,cx+r,cy+r)).resize((150,150),Image.Resampling.NEAREST)
        xx,yy=(i%6)*150,(i//6)*170;sheet.paste(crop,(xx,yy+20))
        ImageDraw.Draw(sheet).text((xx+2,yy+3),f"{a['id']}: {cx},{cy} r{a['radius']:.1f}",fill='white')
    sheet.save(OUT/f'{n}-large-atlas.png')
    report.append({'cardId':f'ecard1-{n}','proposals':proposals})
    print(n,len(proposals),flush=True)
(OUT/'large-proposals.json').write_text(json.dumps(report,indent=2)+'\n')
