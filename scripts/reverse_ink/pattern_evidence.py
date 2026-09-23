"""Register photograph contrast fields on the independently measured wheel.

Evidence only: foreground remains in these fields. Family medians receive equal
weight, so one family's symbols cannot dominate the proposed common geometry.
"""
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw
from normalize import DATA


def main():
    measurements=json.loads((DATA/'review/radial/measurements.json').read_text())
    records={r['id']:r for r in json.loads((DATA/'references/manifest.json').read_text())['references']}
    fields=np.load(DATA/'work/contrast-fields.npz')
    by_family={}; aligned={}
    yy,xx=np.mgrid[:880,:630].astype(np.float32)
    for row in measurements:
        if row['review_status']=='rejected': continue
        ratio=row['inner_ring_radius']/105
        cx,cy=row['center']
        field=cv2.remap(fields[row['id']],(xx-448)*ratio+cx,(yy-598)*ratio+cy,cv2.INTER_LINEAR)
        aligned[row['id']]=field
        by_family.setdefault(records[row['id']]['family'],[]).append(field)
    family_fields={k:np.median(v,axis=0) for k,v in by_family.items()}
    common=np.median(list(family_fields.values()),axis=0)
    np.savez_compressed(DATA/'work/aligned-pattern-fields.npz',**aligned)
    np.savez_compressed(DATA/'work/shared-pattern-fields.npz',common=common,**family_fields)
    display=Image.fromarray(np.uint8(np.clip(common*45+128,0,255))).convert('RGB')
    display=display.resize((1260,1760))
    draw=ImageDraw.Draw(display)
    for x in range(0,630,25):
        draw.line((x*2,0,x*2,1760),fill='#9d7272',width=1)
        draw.text((x*2+1,880),str(x),fill='white')
    for y in range(0,880,25):
        draw.line((0,y*2,1260,y*2),fill='#9d7272',width=1)
        draw.text((0,y*2),str(y),fill='white')
    display.crop((0,880,1260,1700)).save(DATA/'work/shared-body-grid.png')
    print(f'Aligned {len(aligned)} sources from {len(family_fields)} families')


if __name__=='__main__': main()
