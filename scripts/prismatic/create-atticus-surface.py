"""Build the complete Atticus directional reconstruction as authored PNG maps.

Regional guide curves and boundaries are explicit exact-card authoring inputs.
Repeated ridges follow those guides; their phase/depth are rendering estimates,
not individually photographed measurements. No random or image-derived relief.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy.interpolate import PchipInterpolator
from coverage_raster import contour

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'public/cards/pokemon/prismatic-evolutions/maps'


def build():
    spec = json.loads(Path(__file__).with_name('atticus-surface-regions.json').read_text())
    foil = np.asarray(Image.open(OUT/'133-holo-foil.png'))
    protection = np.asarray(Image.open(OUT/'133-holo-protection.png'))
    h, w = foil.shape
    yy, xx = np.mgrid[:h, :w].astype(np.float32)
    x, y = (xx+.5)/2, (yy+.5)/2
    # Curving diagonal silver-sheet lines, separately bounded by art and rules.
    phase = (x*.74+y*.67+8*np.sin(x/73)+6*np.sin(y/89))/2.6
    labels = Image.new('L', (w,h), 1)
    draw = ImageDraw.Draw(labels)
    for i,r in enumerate(spec['regions'],2):
        contour(draw, r['path'], i, scale=2)
    label = np.asarray(labels).copy()
    height = np.zeros((h,w),np.float32)
    normal = np.zeros((h,w,3),np.float32); normal[:,:,2]=1
    direction = np.zeros((h,w,4),np.float32)
    roughness = np.full((h,w),.39,np.float32)

    def assign(mask, phase, depth, rough):
        # Narrow rounded crests and shallow recessed flanks. The continuous
        # regional field is differentiated BEFORE clipping, avoiding raised ink
        # silhouettes at every material boundary.
        wave = np.cos(phase*2*np.pi)
        relief = depth*(np.maximum(wave,0)**3-.32*np.maximum(-wave,0)**2)
        gy,gx = np.gradient(relief,88000/h,63000/w)
        nn=np.stack([-gx,gy,np.ones_like(gx)],axis=2)
        nn/=np.linalg.norm(nn,axis=2,keepdims=True)
        py,px=np.gradient(phase)
        angle=np.arctan2(-py,px)
        height[mask]=relief[mask];normal[mask]=nn[mask]
        direction[mask]=np.stack([np.cos(2*angle)*.5+.5,np.sin(2*angle)*.5+.5,np.full_like(x,1/3),np.ones_like(x)],axis=2)[mask]
        roughness[mask]=rough

    assign(label==1,phase,1.6,.36)
    for i,r in enumerate(spec['regions'],2):
        mask=label==i
        if r['axis']=='smooth':
            continue
        guide=np.asarray(r['guide'])
        if r['axis']=='x':
            phase=(x-PchipInterpolator(guide[:,0],guide[:,1])(y))/r['spacing']
        else:
            phase=(y-PchipInterpolator(guide[:,0],guide[:,1])(x))/r['spacing']
        assign(mask,phase,r['depth'],.40 if 'glove' in r['name'].lower() else .37)
    # Previously authored eyebrow/lash islands override the surrounding smooth
    # face exclusion. Their local normal convention matches this compiler.
    eye=ROOT/'research/prismatic-evolutions/relief/133-eye'
    eye_mask=np.asarray(Image.open(eye/'foil.png'))>0
    protected=(foil==0)|(protection>=200)
    height[protected]=0;normal[protected]=[0,0,1];direction[protected]=0;roughness[protected]=.48
    height[eye_mask]=(np.asarray(Image.open(eye/'height.png'),dtype=float)[eye_mask]/255-.5)*8
    normal[eye_mask]=np.asarray(Image.open(eye/'normal.png'),dtype=float)[eye_mask]/127.5-1
    direction[eye_mask]=np.asarray(Image.open(eye/'direction.png'),dtype=float)[eye_mask]/255
    roughness[eye_mask]=.39
    byte=lambda a:np.rint(np.clip(a,0,1)*255).astype(np.uint8)
    maps={'height':byte(.5+height/8),'normal':byte(normal*.5+.5),'direction':byte(direction),'roughness':byte(roughness)}
    for name,a in maps.items(): Image.fromarray(a).save(OUT/f'133-holo-{name}.png',optimize=True)
    assert np.all(maps['normal'][protected & ~eye_mask]==[128,128,255])
    assert np.all(maps['height'][protected & ~eye_mask]==128)
    assert np.all(maps['direction'][protected & ~eye_mask,3]==0)
    # Region overview is for authoring inspection only, not a material channel.
    Image.fromarray(label).save(ROOT/'research/prismatic-evolutions/relief/133-regions.png')
    evidence=json.loads((OUT/'133-holo-evidence.json').read_text())
    references=json.loads((ROOT/'research/prismatic-evolutions/references.json').read_text())
    evidence['references']=[{'file':p['file'], 'observed':p['notes'],
        'sha256':hashlib.sha256((ROOT/'research/prismatic-evolutions/photos'/p['file']).read_bytes()).hexdigest(),
        **({'listing':f'https://www.ebay.com/itm/{p["listing"]}'} if 'listing' in p else {'source':p['source']})}
        for p in references['photos'] if p['cardId']=='sv08.5-133' and p['variant']=='holo']
    evidence.update(status='directional-reconstruction',rendererReady=True,
        authoring=spec['authoring'],remaining='',
        limitations='Photo-guided full-card reconstruction; ridge positions and 1.5–2.2 micrometre relief are calibrated approximations, not pixel-exact or measured physical geometry.',
        regions=spec['regions'],depthCalibration='1.5–2.2 micrometre rounded crests with shallow valleys; no procedural shader emboss or sparkle.')
    for name in ['foil','protection',*maps]:
        p=OUT/f'133-holo-{name}.png';evidence['maps'][p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
    (OUT/'133-holo-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')
    print('Atticus: complete regional reconstruction; six PNG material maps, protected ink flat')


if __name__=='__main__': build()
