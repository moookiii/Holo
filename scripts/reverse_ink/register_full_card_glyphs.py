"""Fit repeated glyph poses to one selected photo using signed boundary contrast.

Only similarity transforms change. No photo contours, texture, or new vertices
are exported. Explicit analysis intervals omit known printed rows; they are not
per-card protection maps. The resulting placements remain review candidates.
"""
import argparse
import json
import cv2
import numpy as np
from PIL import Image
from scipy.optimize import differential_evolution
from full_card import read, DATA, centered_glyph
from build_colorless_body import authored_path
from build_pattern_drafts import transform_path
from fit_symbol import sample_path

PRINT_ROWS = {
    'grass':[(541,606),(748,787),(807,850)],
    'fire':[(550,636),(750,790),(806,857)],
    'water':[(510,594),(642,671),(745,786),(803,850)],
    'lightning':[(538,599),(741,782),(800,846)],
    'psychic':[(560,594),(748,789),(806,850)],
    'fighting':[(472,588),(630,691),(747,790),(806,850)],
    'darkness':[(539,601),(743,785),(803,850)],
    'dragon':[(532,563),(615,647),(749,789),(806,850)],
    'trainer':[(484,566),(614,699),(763,855)],
    'metal':[(536,602),(744,785),(799,851)],
}


def boundary_samples(paths):
    loops=[sample_path(p,16).astype('float32') for p in paths]
    points=[]; normals=[]
    for loop in loops:
        tangent=np.roll(loop,-1,axis=0)-np.roll(loop,1,axis=0)
        normal=np.c_[-tangent[:,1],tangent[:,0]]
        normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-6)
        for p,n in zip(loop,normal):
            q=p+n*.35
            light=sum(cv2.pointPolygonTest(l,tuple(map(float,q)),False)>=0 for l in loops)%2
            points.append(p);normals.append(n if light else -n)
    return np.array(points),np.array(normals)


def register(family):
    path=DATA/f'references/full-card/{family}.json'
    spec=read(path)
    if not spec['body_glyphs']:
        return
    rows={r['id']:r for r in read(DATA/'review/radial/measurements.json')}
    row=rows[spec['source']]
    glyphs=centered_glyph(family,rows)
    if 'glyph_source' in spec:
        g=spec['glyph_source']
        glyphs=[transform_path(authored_path(d),np.eye(2)*g['scale'],-np.array(g['origin'])*g['scale']) for d in g['paths']]
    pts,normals=boundary_samples(glyphs)
    raw=np.array(Image.open(DATA/f'normalized/{spec["source"]}.png').convert('RGB'))
    scale=raw.shape[1]/630
    field=cv2.GaussianBlur(cv2.cvtColor(raw,cv2.COLOR_RGB2GRAY).astype('float32')/255,(0,0),scale*.65)
    # Broad local contrast rescales weakly lit areas without altering edges.
    high=cv2.GaussianBlur(field,(0,0),scale*12)
    amplitude=cv2.GaussianBlur(abs(field-high),(0,0),scale*12)
    field=(field-high)/np.maximum(amplitude,.015)
    ratio=row['inner_ring_radius']/105
    def sample(p):
        return cv2.remap(field,(p[:,0]*scale).astype('float32')[:,None],(p[:,1]*scale).astype('float32')[:,None],cv2.INTER_LINEAR).ravel()
    reports=[]
    for glyph in spec['body_glyphs']:
        initial=np.array([*glyph['center'],glyph['scale'],glyph['rotation']],float)
        # The clipping/window is fixed by the seed; moving toward text cannot
        # improve a score just by changing the denominator of visible samples.
        def geometry(values):
            x,y,s,a=values;a=np.deg2rad(a)
            m=np.array([[np.cos(a),-np.sin(a)],[np.sin(a),np.cos(a)]])
            p=((pts @ m.T)*s+[x-448,y-598])*ratio+row['center']
            n=normals @ m.T
            return p,n
        def contrast(values):
            p,n=geometry(values)
            valid=(p[:,0]>29)&(p[:,0]<601)&(p[:,1]>446)&(p[:,1]<852)
            for lo,hi in PRINT_ROWS[family]:
                valid &= ~((p[:,1]>=lo)&(p[:,1]<=hi))
            v=sample(p+n*1.15)-sample(p-n*1.15)
            # Missing/occluded samples contribute zero, never positive evidence.
            return float(np.sum(np.clip(v,-1,1.5)*valid)/len(v)),int(valid.sum())
        bounds=[(initial[0]-7,initial[0]+7),(initial[1]-7,initial[1]+7),
                (initial[2]*.82,initial[2]*1.18),(-180,180)]
        result=differential_evolution(lambda v:-contrast(v)[0],bounds,seed=731,popsize=9,maxiter=65,tol=.005,polish=True,workers=1)
        before,count_before=contrast(initial)
        after,count_after=contrast(result.x)
        accepted=after>before+.025 and count_after>=len(pts)*.22
        pose=result.x if accepted else initial
        reports.append({'id':glyph['id'],'initial':initial.tolist(),'candidate':result.x.tolist(),
                        'selected':pose.tolist(),'adopted_for_review':bool(accepted),'signed_score_before':before,
                        'signed_score_after':after,'visible_samples':count_after,'total_samples':len(pts)})
        glyph.update(center=np.round(pose[:2],4).tolist(),scale=round(float(pose[2]),5),rotation=round(float(pose[3]),4))
        glyph['registration']='selected-photo-signed-boundary-fit' if accepted else 'authored-seed-retained'
    out=DATA/f'review/full-card/{family}'
    (out/'glyph-registration.json').write_text(json.dumps({'source':spec['source'],'method':__doc__,'glyphs':reports},indent=2)+'\n',encoding='utf-8')
    path.write_text(json.dumps(spec,indent=2)+'\n',encoding='utf-8')
    print(f'{family}: {sum(r["adopted_for_review"] for r in reports)}/{len(reports)} poses improved signed source contrast',flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('family',nargs='?',default='all');a=p.parse_args()
    families=list(PRINT_ROWS) if a.family=='all' else [a.family]
    for family in families:register(family)
