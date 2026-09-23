"""Measure repeat count, phase, disk and spoke shape across reviewed ring fits."""
import json
import numpy as np
from PIL import Image, ImageDraw
from normalize import DATA
from measure_radial import ring_samples

# Reviewed ring overlays: glare suppresses the relevant edge in these photos.
REJECT={'oddish':'Glare softens ring; fitted radius follows an outer edge.',
        'abra':'Right-side glare breaks ring contrast; fit follows a larger contour.'}

def main():
    rows=json.loads((DATA/'review/radial/measurements.json').read_text())
    fields=np.load(DATA/'work/contrast-fields.npz')
    angles=np.linspace(0,2*np.pi,720,endpoint=False)
    profiles=[]
    for row in rows:
        if row['id'] in REJECT:
            row.update(review_status='rejected',review_reason=REJECT[row['id']]);continue
        row.update(review_status='visually-reviewed-ring-fit',review_reason='Follows visible inner edge of bright ring; foreground angles may be occluded.')
        cx,cy=row['center'];radius=row['inner_ring_radius']
        bands=[ring_samples(fields[row['id']],cx,cy,radius*t,angles) for t in [.65,.72,.79,.86]]
        p=np.median(bands,axis=0)
        p=(p-np.mean(p))/max(np.std(p),.001)
        profiles.append(p)
    profile=np.median(profiles,axis=0)
    fft=np.fft.rfft(profile)
    harmonics={str(i):round(float(abs(fft[i])/len(profile)),5) for i in range(6,17)}
    dominant=max(harmonics,key=harmonics.get)
    geometry=np.array([r['center']+[r['inner_ring_radius']] for r in rows if r['id'] not in REJECT])
    summary=dict(measurement_units='630 x 880 card-space',accepted_references=len(profiles),rejected=REJECT,
                 median_center= np.median(geometry[:,:2],axis=0).round(3).tolist(),
                 median_inner_ring_radius=round(float(np.median(geometry[:,2])),3),
                 center_range=[geometry[:,:2].min(axis=0).round(3).tolist(),geometry[:,:2].max(axis=0).round(3).tolist()],
                 radius_range=[round(float(geometry[:,2].min()),3),round(float(geometry[:,2].max()),3)],
                 angular_harmonics=harmonics,dominant_spatial_harmonic=int(dominant),
                 interpretation='Dominant harmonic requires visual spoke-count confirmation; shared radius does not prove identical whole artwork.')
    out=DATA/'review/radial'
    (out/'measurements.json').write_text(json.dumps(rows,indent=2)+'\n')
    (out/'structure.json').write_text(json.dumps(summary,indent=2)+'\n')
    image=Image.new('RGB',(900,260),'white');draw=ImageDraw.Draw(image)
    draw.text((20,10),'Median angular contrast, radius 0.65–0.86 of ring; 31 reviewed references',fill='black')
    pts=[(20+i*860/719,140-float(v)*65) for i,v in enumerate(profile)]
    draw.line(pts,fill='#173a61',width=2)
    for i in range(11):
        x=20+i*86;draw.line((x,35,x,225),fill='#cccccc');draw.text((x,235),str(i*36),fill='black')
    image.save(out/'angular-profile.png')
    print(json.dumps(summary,indent=2))

if __name__=='__main__':main()
