"""Assemble all eleven family pattern drafts from the measured shared structure.

Explicitly partial: no geometry is synthesized behind the common illustration
occlusion, and missing repeated symbols are not silently filled from a tile.
"""
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np
import cv2
from PIL import Image, ImageDraw
from scipy.optimize import least_squares
from normalize import DATA, ROOT
from fit_symbol import sample_path, svg_path
from reconstruct_wheel import svg_geometry, outline_vertices, polar


def rounded_polygon(vertices, amount):
    v=np.array(vertices,dtype=float);entries=[];exits=[]
    for i,p in enumerate(v):
        before=v[i-1]-p;after=v[(i+1)%len(v)]-p
        entries.append(p+before/np.linalg.norm(before)*min(amount,np.linalg.norm(before)*.25))
        exits.append(p+after/np.linalg.norm(after)*min(amount,np.linalg.norm(after)*.25))
    curves=[]
    for i,p in enumerate(v):
        start=entries[i];end=exits[i]
        curves.append([(start+(p-start)*2/3).tolist(),(end+(p-end)*2/3).tolist(),end.tolist()])
        next_point=entries[(i+1)%len(v)]
        curves.append([(end+(next_point-end)/3).tolist(),(end+2*(next_point-end)/3).tolist(),next_point.tolist()])
    return {'start':entries[0].tolist(),'curves':curves}


def refine_pebble(pebble, evidence):
    """Move only authored vertices; preserve straight edges and rounded corners.

    Independent Bezier control fitting admits texture-shaped bumps. This model
    has only two variables per landmark and one fixed corner-rounding distance.
    """
    initial=np.array(pebble['vertices'],dtype=float)
    points=sample_path(rounded_polygon(initial,pebble['rounding']))
    tangent=np.roll(points,-1,axis=0)-np.roll(points,1,axis=0)
    normals=np.c_[-tangent[:,1],tangent[:,0]]
    normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],.001)
    offsets=np.linspace(-5,5,41)
    candidates=points[:,None]+offsets[None,:,None]*normals[:,None]
    def read(coords):
        return cv2.remap(evidence,coords[:,:,0].astype('float32'),coords[:,:,1].astype('float32'),cv2.INTER_LINEAR)
    edges=abs(read(candidates+normals[:,None])-read(candidates-normals[:,None]))
    selected=edges.argmax(axis=1)
    targets=candidates[np.arange(len(points)),selected]
    strength=edges[np.arange(len(points)),selected]
    weights=np.clip(strength/max(float(np.median(strength)),.001),.1,1.5)
    def residual(values):
        current=sample_path(rounded_polygon(values.reshape(-1,2),pebble['rounding']))
        return np.r_[np.sum((current-targets)*normals,axis=1)*weights,(values-initial.ravel())*.8]
    fitted=least_squares(residual,initial.ravel(),bounds=(initial.ravel()-5,initial.ravel()+5),loss='soft_l1',max_nfev=100)
    path=rounded_polygon(fitted.x.reshape(-1,2),pebble['rounding'])
    error=abs(np.sum((sample_path(path)-targets)*normals,axis=1))
    return path,{'median_selected_edge_distance':float(np.median(error)),
                 'vertex_count':len(initial),'vertex_search_bound':5,
                 'warning':'Selected gradient residual, not independent accuracy. Shape remains a review candidate.'}


def transform_path(path, matrix, offset):
    return {'start':(np.array(path['start'])@matrix.T+offset).tolist(),
            'curves':(np.array(path['curves'])@matrix.T+offset).tolist()}


def main():
    layout=json.loads((DATA/'references/shared-layout.json').read_text())
    if layout['status'].startswith('rejected'):
        raise SystemExit('Rejected dark-network topology: refusing to regenerate the obsolete pebble drafts. Use trace_network_detail.py for the corrected bounded Colorless evidence.')
    model=json.loads((DATA/'review/radial/wheel-model.json').read_text())['model']
    placement=json.loads((DATA/'review/patterns/sector-placement.json').read_text())
    index=json.loads((ROOT/'assets/reverse-ink/sv/index.json').read_text())
    evidence=np.load(DATA/'work/shared-pattern-fields.npz')['common'].astype(np.float32)
    evidence=cv2.GaussianBlur(evidence,(0,0),1.2)
    paths=[];measurements=[]
    for pebble in layout['pebbles']:
        path,metric=refine_pebble(pebble,evidence)
        paths.append(path);measurements.append({'id':pebble['id'],**metric})
    wheel=svg_geometry(model)
    target=ROOT/'assets/reverse-ink/sv/drafts';target.mkdir(exist_ok=True)
    out=DATA/'review/patterns';out.mkdir(exist_ok=True)
    (out/'pebble-measurements.json').write_text(json.dumps(measurements,indent=2)+'\n')
    rows={r['id']:r for r in json.loads((DATA/'review/radial/measurements.json').read_text())}
    manifest=json.loads((DATA/'references/manifest.json').read_text())['references']
    support=[]
    for family in index['families']:
        name=family['id']
        symbol=json.loads((DATA/f'review/symbols/{name}.json').read_text())
        glyph_accepted=family.get('symbol_status')!='rejected-needs-retrace'
        source_anchor=rows[symbol['spec']['source']]
        ratio=105/source_anchor['inner_ring_radius']
        x,y,*_=symbol['spec']['patch']
        translation=np.array([448,598])+ratio*(np.array([x,y])-source_anchor['center'])
        centered_paths=[transform_path(p,np.eye(2)*ratio,translation-[448,598]) for p in symbol['refined_paths']] if glyph_accepted else []
        sector_paths=[]
        for sector in range(10):
            angle=np.deg2rad(placement['rotation_base_degrees']+36*sector)
            matrix=placement['scale']*np.array([[np.cos(angle),-np.sin(angle)],[np.sin(angle),np.cos(angle)]])
            center=polar(placement['radius'],18+36*sector+placement['phase_degrees'])
            sector_paths.append([transform_path(p,matrix,center) for p in centered_paths])
        fragments=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 440 630 410">',
            f'<title>{name}: partial observed reverse pattern</title>',
            '<desc>Measured wheel, source-traced pebbles, central family glyph and ten sector glyph cutouts. Missing geometry is unknown, not blank authored artwork. Positive lighter fields only; not a final pigment mask. See shared-layout.json.</desc>',
            '<g fill="currentColor" fill-rule="evenodd">']
        fragments.extend(f'<path d="{svg_path(p)}"/>' for p in paths)
        fragments.append('<g transform="translate(448 598)">')
        fragments.append(f'<path d="{wheel[0]}"/>')
        for sector in range(10):
            cutouts=' '.join(svg_path(p) for p in sector_paths[sector])
            fragments.append(f'<path d="{wheel[sector+1]} {cutouts}"/>')
        fragments.append('</g>')
        if glyph_accepted:
            fragments.append(f'<g transform="translate({translation[0]:.5f} {translation[1]:.5f}) scale({ratio:.6f})">')
            fragments.append(f'<path d="{" ".join(svg_path(p) for p in symbol["refined_paths"])}"/>')
            fragments.append('</g>')
        for dot in layout['dots']:
            cx,cy=dot['center'];rx,ry=dot['radii']
            fragments.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" transform="rotate({dot["rotation"]} {cx} {cy})"/>')
        fragments.append('</g></svg>')
        (target/f'{name}-body.svg').write_text('\n'.join(fragments)+'\n',encoding='utf-8')
        family['pattern_draft']=f'drafts/{name}-body.svg'
        family['pattern_status']='partial-body-needs-review'
        for record in manifest:
            if record['family']!=name or record['role']!='reverse-reference':continue
            row=rows[record['id']];r=row['inner_ring_radius']/105
            center=np.array(row['center'])
            if row['review_status']=='rejected':r=1;center=np.array([448,598])
            image=Image.open(DATA/'normalized'/f"{record['id']}.png").convert('RGB').resize((945,1320))
            draw=ImageDraw.Draw(image)
            def draw_line(points):
                points=((np.asarray(points)-[448,598])*r+center)*1.5
                draw.line([tuple(p) for p in points],fill='#ed2166',width=1)
            for path in paths:draw_line(sample_path(path,40))
            vertices=outline_vertices(model['outline_parameters'])+[448,598]
            draw_line(np.vstack([vertices,vertices[0]]))
            for radius in [105,model['disk_radius']]:draw_line(polar(radius,np.linspace(0,360,361))+[448,598])
            for sector in range(10):
                for sign in [-1,1]:
                    a=sector*36+sign*model['spoke_half_angle']+model['outline_parameters'][4]
                    draw_line(polar(np.array([model['disk_radius'],105]),a)+[448,598])
            if glyph_accepted:
                for path in symbol['refined_paths']:draw_line(sample_path(path,40)*ratio+translation)
            for group in sector_paths:
                for path in group:draw_line(sample_path(path,40)+[448,598])
            image.crop((0,660,945,1290)).save(out/f"{record['id']}-body-overlay.png")
            support.append({'family':name,'reference':record['id'],'registration':row['review_status']})
    (ROOT/'assets/reverse-ink/sv/index.json').write_text(json.dumps(index,indent=2)+'\n',encoding='utf-8')
    (out/'coverage.json').write_text(json.dumps({'status':'partial','overlays':support,'unknown':layout['unknown']},indent=2)+'\n')
    print(f'Built {len(index["families"])} pattern drafts and {len(support)} reference overlays')


if __name__=='__main__':main()
