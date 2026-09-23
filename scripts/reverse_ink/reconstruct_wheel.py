"""Measure and reconstruct the shared wheel from registered reference evidence.

The exported shape represents the lighter geometric field, not pigment polarity.
Individual sector glyphs and the central family glyph are separate components.
"""
import json
import math
import cv2
import numpy as np
from scipy.ndimage import gaussian_filter
from scipy.optimize import least_squares
from PIL import Image, ImageDraw
from normalize import DATA, ROOT


def polar(radius, degrees):
    a=np.deg2rad(degrees-90)
    return np.stack([radius*np.cos(a),radius*np.sin(a)],axis=-1)


def outline_vertices(parameters):
    short, valley, long, angle, phase=parameters
    points=[]
    for sector in range(10):
        for a,r in [(0,short),(angle,valley),(18,long),(36-angle,valley)]:
            points.append(polar(r,sector*36+a+phase))
    return np.array(points)


def ray_boundary(parameters, angles):
    vertices=outline_vertices(parameters)
    direction=polar(np.ones_like(angles),angles)
    distances=np.full(len(angles),np.inf)
    cross=lambda a,b:a[...,0]*b[...,1]-a[...,1]*b[...,0]
    for a,b in zip(vertices,np.roll(vertices,-1,axis=0)):
        edge=b-a
        divisor=cross(direction,edge)
        with np.errstate(divide='ignore',invalid='ignore'):
            radius=cross(a,edge)/divisor
            fraction=cross(a,direction)/divisor
        valid=(fraction>=0)&(fraction<=1)&(radius>0)
        distances=np.minimum(distances,np.where(valid,radius,np.inf))
    return distances


def measure(field, angles, radii):
    folded=np.median(field.reshape(len(radii),10,72),axis=1)
    smooth=gaussian_filter(folded,(1,1))
    gradient=np.gradient(smooth,.5,axis=0)
    edge=radii[230+np.argmin(gradient[230:308],axis=0)]
    phases=np.arange(72)*.5
    result=least_squares(lambda v:ray_boundary(v,phases)-edge,
        [136,120,148,4.5,0],bounds=([128,115,139,2,-2],[145,126,157,8,2]),
        loss='soft_l1',f_scale=1.0)
    # Exclude the small glyphs between spokes by measuring the disk at its edge.
    profile=np.median(smooth[:,16:56],axis=1)
    disk=float(radii[104+np.argmax(np.gradient(profile,.5)[104:132])])
    # Fit spoke sides from multiple radii, avoiding small sector symbols.
    widths=[]
    for r in range(66,103,3):
        angular=np.gradient(smooth[r*2],.5)
        widths.append([np.argmax(angular[:20])*.5,36-(52+np.argmin(angular[52:]))*.5])
    half=float(np.median(widths))
    residual=ray_boundary(result.x,phases)-edge
    return dict(outline_parameters=result.x.tolist(),disk_radius=disk,
                spoke_half_angle=half,outer_edge_median_error=float(np.median(abs(residual))),
                outer_edge_p95_error=float(np.percentile(abs(residual),95)))


def svg_geometry(model):
    vertices=outline_vertices(model['outline_parameters'])
    fmt=lambda p:f'{p[0]:.4f} {p[1]:.4f}'
    outer='M '+' L '.join(map(fmt,vertices))+' Z'
    circle='M 105 0 A 105 105 0 1 0 -105 0 A 105 105 0 1 0 105 0 Z'
    paths=[outer+' '+circle]
    r=model['disk_radius'];half=model['spoke_half_angle']
    phase=model['outline_parameters'][4]
    for i in range(10):
        a=i*36+half+phase;b=(i+1)*36-half+phase
        p,q=polar(105,a),polar(105,b);u,v=polar(r,b),polar(r,a)
        paths.append(f'M {fmt(p)} A 105 105 0 0 1 {fmt(q)} L {fmt(u)} A {r} {r} 0 0 0 {fmt(v)} Z')
    return paths


def main():
    rows=json.loads((DATA/'review/radial/measurements.json').read_text())
    records={r['id']:r for r in json.loads((DATA/'references/manifest.json').read_text())['references']}
    fields=np.load(DATA/'work/contrast-fields.npz')
    angles=np.linspace(0,360,720,endpoint=False);radii=np.arange(0,170.5,.5)
    sample_sets={};source_ids=[]
    for row in rows:
        if row['review_status']=='rejected':continue
        cx,cy=row['center'];ratio=row['inner_ring_radius']/105
        offsets=polar(radii[:,None]*ratio,angles[None,:])
        sampled=cv2.remap(fields[row['id']],(cx+offsets[:,:,0]).astype('float32'),
                         (cy+offsets[:,:,1]).astype('float32'),cv2.INTER_LINEAR)
        sample_sets.setdefault(records[row['id']]['family'],[]).append(sampled)
        source_ids.append(row['id'])
    family_medians={k:np.median(v,axis=0) for k,v in sample_sets.items()}
    model=measure(np.median(list(family_medians.values()),axis=0),angles,radii)
    family_models={k:measure(v,angles,radii) for k,v in family_medians.items()}
    report={'status':'measured-component-needs-layout-review','coordinate_center':[448,598],
            'reference_inner_ring_radius':105,'sources':source_ids,'model':model,
            'family_models':family_models,
            'limitations':['Registration residuals include photography and manual card-corner error.',
                          'Ten-fold folding tests shared geometry but cannot validate individual sector glyphs.',
                          'Outer edge errors are against diagnostic gradients, not ground-truth contours.',
                          'Positive shape means lighter wheel field; pigment polarity is not established.']}
    out=DATA/'review/radial'
    (out/'wheel-model.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    geometry=svg_geometry(model)
    target=ROOT/'assets/reverse-ink/sv/structure';target.mkdir(exist_ok=True)
    svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-160 -160 320 320">\n'
    svg+='<title>Measured shared Scarlet and Violet wheel field</title>\n'
    svg+='<desc>Ten spokes and interleaved outer teeth. Geometry only; family glyphs are separate. See research/reverse-ink/review/radial/wheel-model.json.</desc>\n'
    svg+='\n'.join(f'<path fill="currentColor" fill-rule="evenodd" d="{p}"/>' for p in geometry)
    (target/'wheel.svg').write_text(svg+'\n</svg>\n',encoding='utf-8')
    contact=Image.new('RGB',(350*6,380*6),'#ececec');draw=ImageDraw.Draw(contact)
    vertices=outline_vertices(model['outline_parameters'])
    for index,row in enumerate(rows):
        im=Image.open(DATA/'normalized'/f"{row['id']}.png").convert('RGB')
        scale=im.width/630;cx,cy=row['center'];ratio=row['inner_ring_radius']/105
        half=160*ratio
        crop=im.crop(tuple(round(v*scale) for v in (cx-half,cy-half,cx+half,cy+half))).resize((350,350))
        overlay=ImageDraw.Draw(crop)
        def line(points):
            points=(np.array(points)+160)*350/320
            overlay.line([tuple(p) for p in points],fill='#ed2166',width=1)
        line(np.vstack([vertices,vertices[0]]))
        for radius in [105,model['disk_radius']]:
            line(polar(radius,np.linspace(0,360,361)))
        for sector in range(10):
            for sign in [-1,1]:
                a=sector*36+sign*model['spoke_half_angle']+model['outline_parameters'][4]
                line(polar(np.array([model['disk_radius'],105]),a))
        crop.save(out/f"{row['id']}-wheel.png")
        x=index%6*350;y=index//6*380
        contact.paste(crop,(x,y+28))
        draw.text((x+4,y+6),row['id']+(' / REGISTRATION REJECTED' if row['review_status']=='rejected' else ''),fill='black')
    contact.save(out/'wheel-contact.png')
    print(json.dumps(model,indent=2))


if __name__=='__main__':main()
