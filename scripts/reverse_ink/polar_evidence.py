"""Compare radial geometry after independent ring registration.

Produces an evidence field in polar coordinates. No source foreground is
removed or inpainted; median agreement across photographs reduces isolated
obstructions. A candidate field is not an approved SVG contour.
"""
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw
from normalize import DATA

def main():
    rows=json.loads((DATA/'review/radial/measurements.json').read_text())
    fields=np.load(DATA/'work/contrast-fields.npz')
    angles=np.linspace(-np.pi/2,3*np.pi/2,720,endpoint=False)
    radii=np.linspace(0,170,341)
    evidence=[];names=[]
    for row in rows:
        if row['review_status']=='rejected':continue
        cx,cy=row['center'];ratio=row['inner_ring_radius']/105
        x=cx+radii[:,None]*ratio*np.cos(angles)[None,:]
        y=cy+radii[:,None]*ratio*np.sin(angles)[None,:]
        sample=cv2.remap(fields[row['id']],x.astype(np.float32),y.astype(np.float32),cv2.INTER_LINEAR)
        evidence.append(sample);names.append(row['id'])
    evidence=np.stack(evidence)
    median=np.median(evidence,axis=0)
    # Ten-fold phase preserves the 36-degree structure while reducing symbols
    # and neighboring pebble differences. Compare with unfolded data before use.
    folded=np.median(median.reshape((len(radii),10,72)),axis=1)
    out=DATA/'review/radial';work=DATA/'work'
    np.savez_compressed(work/'polar-evidence.npz',radii=radii,angles=angles,median=median,folded=folded)
    def panel(data,scale_x):
        gray=np.uint8(np.clip(128+data*65,0,255))
        im=Image.fromarray(gray).convert('RGB').resize((data.shape[1]*scale_x,data.shape[0]*2))
        return im
    sheet=Image.new('RGB',(1120,750),'white');d=ImageDraw.Draw(sheet)
    d.text((10,5),'Unfolded angular evidence | 0 degrees at top, clockwise | radius 0–170',fill='black')
    sheet.paste(panel(median,1),(45,35))
    d.text((800,5),'Median folded at 36 degrees',fill='black')
    sheet.paste(panel(folded,4),(815,35))
    for r in [0,40,50,60,80,100,105,120,140,160,170]:
        y=35+int(r*4);d.text((4,y),str(r),fill='black');d.line((45,y,765,y),fill='#e07d7d');d.line((815,y,1103,y),fill='#e07d7d')
    sheet.save(out/'polar-evidence.png')
    summary={'source_ids':names,'accepted_count':len(names),'reference_radius':105,
             'radial_sample_step':.5,'angle_sample_step_degrees':.5,
             'purpose':'Diagnostic for measuring disk, spokes and outer teeth; not final geometry.'}
    (out/'polar-evidence.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(f'Compared radial structure from {len(names)} independently registered references')

if __name__=='__main__':main()
