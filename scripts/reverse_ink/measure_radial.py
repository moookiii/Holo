"""Measure the large radial landmark independently on each normalized reference.

The circular inner edge of the light outer ring is sampled away from symbols.
Foreground-contaminated angular samples are trimmed, not inpainted. Fits are
diagnostics requiring visual review, not an automatic asset approval gate.
"""
import json
import cv2
import numpy as np
from scipy.optimize import differential_evolution
from PIL import Image, ImageDraw
from normalize import DATA

def ring_samples(field, cx, cy, radius, angles, offset=0):
    x=cx+(radius+offset)*np.cos(angles)
    y=cy+(radius+offset)*np.sin(angles)
    return cv2.remap(field,x.astype(np.float32)[None],y.astype(np.float32)[None],cv2.INTER_LINEAR)[0]

def fit(field):
    angles=np.linspace(0,2*np.pi,360,endpoint=False)
    def objective(p):
        # Bright outer ring against the darker sectors/spokes inside it.
        inner=ring_samples(field,*p,angles,offset=-3)
        outer=ring_samples(field,*p,angles,offset=3)
        difference=outer-inner
        # Ignore strongest text edges and damaged angular samples at either end.
        return -float(np.mean(np.sort(difference)[72:288]))
    result=differential_evolution(objective,[(425,465),(582,620),(100,124)],seed=193,
                                   popsize=12,maxiter=100,tol=.0001,polish=True,workers=1)
    return result.x, -result.fun

def main():
    manifest=json.loads((DATA/'references/manifest.json').read_text())
    fields=np.load(DATA/'work/contrast-fields.npz')
    out=DATA/'review/radial';out.mkdir(parents=True,exist_ok=True)
    reports=[]
    for record in manifest['references']:
        if record['role']!='reverse-reference':continue
        name=record['id']; p,score=fit(fields[name])
        cx,cy,r=map(float,p)
        report=dict(id=name,family=record['family'],center=[round(cx,3),round(cy,3)],
                    inner_ring_radius=round(r,3),trimmed_edge_contrast=round(score,4),
                    review_status='candidate-needs-visual-review')
        reports.append(report)
        image=Image.open(DATA/'normalized'/f'{name}.png').resize((630,880),Image.Resampling.LANCZOS)
        draw=ImageDraw.Draw(image)
        draw.ellipse((cx-r,cy-r,cx+r,cy+r),outline='#ff286b',width=1)
        draw.line((cx-8,cy,cx+8,cy),fill='#ff286b',width=1)
        draw.line((cx,cy-8,cx,cy+8),fill='#ff286b',width=1)
        image.crop((285,440,610,752)).save(out/f'{name}.png')
    (out/'measurements.json').write_text(json.dumps(reports,indent=2)+'\n')
    sheet=Image.new('RGB',(325*6,344*6),'#eeeeee')
    draw=ImageDraw.Draw(sheet)
    for i,row in enumerate(reports):
        x=i%6*325;y=i//6*344
        draw.text((x+5,y+5),f"{row['id']} r={row['inner_ring_radius']:.1f}",fill='black')
        sheet.paste(Image.open(out/f"{row['id']}.png"),(x,y+25))
    sheet.save(out/'contact.png')
    print(json.dumps(reports,indent=2))

if __name__=='__main__':main()
