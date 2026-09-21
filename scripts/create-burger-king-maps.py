"""Author registered manufacturing DATA from the two unchanged supplied reference images.

Pillow / NumPy / SciPy. The photos are never used as gold albedo and never overwritten.
Low-frequency anatomy is authored explicitly; small raised outlines are extracted as
local ridge candidates, not interpreted as absolute photometric depth. All millimetre
heights below are reconstruction estimates, pending calipers / profilometry.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter, map_coordinates, grey_opening, label, distance_transform_edt

ROOT = Path(__file__).resolve().parents[1] / 'public/cards/charizard-burger-king-1999'
W, H = 1008, 1584
y, x = np.mgrid[:H, :W].astype(float)
u, v = x/(W-1), y/(H-1)


def save(name, value):
    Image.fromarray(np.rint(np.clip(value, 0, 1)*255).astype('uint8')).save(ROOT / f'{name}.png', optimize=True)


def reference(name, corners, supplied=False):
    # Bilinear registration to the die face, independent of the reference background.
    path = ROOT / f'{name}.png' if supplied else Path(__file__).parent / 'references/burger-king' / f'psa-{name}.jpg'
    im = np.asarray(Image.open(path).convert('RGB'), dtype=float)/255
    tl, tr, br, bl = np.array(corners)
    coords = ((1-u)[...,None]*(1-v)[...,None]*tl + u[...,None]*(1-v)[...,None]*tr
              + u[...,None]*v[...,None]*br + (1-u)[...,None]*v[...,None]*bl)
    gray = im @ np.array([.2126,.7152,.0722])
    return map_coordinates(gray, [coords[...,1], coords[...,0]], order=1, mode='nearest')


def polygon(points, blur=8):
    im = Image.new('L', (W,H)); ImageDraw.Draw(im).polygon([(int(a*W),int(b*H)) for a,b in points], fill=255)
    return gaussian_filter(np.asarray(im,dtype=float)/255,blur)


def dome(cx,cy,rx,ry):
    h = np.maximum(0,1-((u-cx)/rx)**2-((v-cy)/ry)**2)
    return h*smooth(0,.18,h)


def smooth(a,b,z):
    t=np.clip((z-a)/(b-a),0,1); return t*t*(3-2*t)


def lettering(lines):
    image=Image.new('L',(W,H))
    for copy,px,py,size,width in lines:
        font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',size)
        box=font.getbbox(copy); glyph=Image.new('L',(box[2]+3,box[3]-box[1]+3))
        ImageDraw.Draw(glyph).text((1,1-box[1]),copy,font=font,fill=255)
        glyph=glyph.resize((int(width*W),glyph.height),Image.Resampling.LANCZOS)
        image.paste(glyph,(int(px*W),int(py*H)))
    return gaussian_filter(np.asarray(image,dtype=float)/255,.9)


def author(side, corners):
    photo = gaussian_filter(reference(side,corners,supplied=side=='front'),1.3)
    # Ignore broad illumination: only narrow local ridges can add shallow detail.
    if side == 'front':
        # The supplied dark-field photograph resolves continuous die outlines better
        # than the graded scan. Recover contour footprints, then bevel them geometrically.
        candidates=photo>.33
    else:
        candidates=(photo-grey_opening(photo,size=(25,25)))>.11
    regions,count=label(candidates)
    sizes=np.bincount(regions.ravel()); keep=sizes>=180; keep[0]=False
    outline=keep[regions]
    signed=distance_transform_edt(outline)-distance_transform_edt(~outline)
    ridges=gaussian_filter(smooth(-2.2,3.5,signed),1.4)
    radius=.22/4.445
    qx=np.abs(u-.5)-(.5-radius); qy=np.abs((v-.5)*H/W)-(H/W/2-radius)
    rim_distance=radius-np.hypot(np.maximum(qx,0),np.maximum(qy,0))-np.minimum(np.maximum(qx,qy),0)
    seam = smooth(.004,.018,rim_distance)
    inner = smooth(.033,.047,rim_distance)
    raised_rim = seam*(1-inner)
    height = .055*seam + .18*raised_rim  # millimetres
    if side == 'front':
        name_area=polygon([(.08,.902),(.575,.902),(.575,.951),(.08,.951)],2)
        ridges *= 1-name_area
        # The wings, torso, head, arms, haunches and belly are separate die levels.
        leftwing=polygon([(.055,.65),(.055,.49),(.16,.37),(.25,.33),(.31,.40),(.36,.52),(.44,.58),(.36,.65),(.25,.57),(.20,.49),(.20,.62)])
        rightwing=polygon([(.57,.60),(.67,.50),(.70,.34),(.77,.36),(.90,.43),(.96,.56),(.91,.66),(.82,.62),(.83,.50),(.76,.57),(.74,.47),(.68,.62)])
        torso=polygon([(.37,.47),(.36,.42),(.42,.36),(.53,.40),(.59,.47),(.55,.54),(.56,.61),(.63,.67),(.71,.74),(.67,.82),(.57,.85),(.40,.85),(.30,.77),(.29,.72),(.40,.61),(.44,.54)])
        height += .09*(leftwing+rightwing)*inner
        height += .22*torso
        height += .49*dome(.50,.744,.175,.093)
        height += .17*dome(.455,.443,.10,.065)
        height += .23*dome(.275,.754,.09,.075)+.23*dome(.68,.786,.09,.07)
        height += .18*dome(.255,.637,.12,.037)+.18*dome(.687,.627,.12,.04)
        # Raised logo outlines are shallower than Charizard's rounded belly.
        detail = np.where(v < .24,.13,np.where(v > .895,.07,.075))
        height += ridges*detail*inner
        height += .09*lettering([('CHARIZARD',.10,.916,32,.44),('©1999 NINTENDO',.59,.973,18,.35)])
        satin = np.clip(leftwing+rightwing,0,1)
        height_max=.90
    else:
        wing=polygon([(.38,.25),(.43,.16),(.48,.12),(.63,.16),(.75,.22),(.80,.27),(.76,.29),(.70,.27),(.66,.30),(.59,.28),(.56,.31),(.49,.28)])
        body=polygon([(.20,.23),(.25,.19),(.29,.26),(.38,.28),(.44,.33),(.50,.39),(.53,.44),(.47,.46),(.38,.44),(.29,.39),(.24,.31),(.18,.29)])
        height += .065*wing + .12*body + .065*dome(.40,.37,.10,.073)
        # The rules panel is an inset, with shallow raised lettering above its floor.
        panel = polygon([(.045,.555),(.953,.555),(.953,.943),(.045,.943)],1.5)
        height -= .025*panel
        # Re-typeset the legible reference copy as smooth die geometry. Reflections in the
        # photograph must not become holes, pitting or invented relief in these small letters.
        ridges *= 1-smooth(.548,.552,v)
        text = Image.new('L',(W,H)); draw=ImageDraw.Draw(text)
        font_path = 'C:/Windows/Fonts/arial.ttf'
        def line(copy,px,py,size,width=None):
            font=ImageFont.truetype(font_path,size)
            box=font.getbbox(copy); glyph=Image.new('L',(box[2]+3,box[3]-box[1]+3)); gd=ImageDraw.Draw(glyph)
            gd.text((1,1-box[1]),copy,font=font,fill=255,stroke_width=0)
            if width: glyph=glyph.resize((int(width*W),glyph.height),Image.Resampling.LANCZOS)
            text.paste(glyph,(int(px*W),int(py*H)))
        line('LENGTH: 5\u20327\u2033  WEIGHT: 200 LBS.',.225,.571,19,.55)
        line('FLAME POKÉMON',.065,.628,25,.43)
        line('SPITS FIRE THAT IS HOT ENOUGH TO MELT',.065,.684,23,.88)
        line('BOULDERS. KNOWN TO CAUSE FOREST',.065,.739,23,.83)
        line('FIRES UNINTENTIONALLY.',.065,.795,23,.57)
        line('EVOLUTION',.41,.85,22,.21)
        draw.line([(int(.066*W),int(.858*H)),(int(.398*W),int(.858*H))],fill=255,width=3)
        draw.line([(int(.63*W),int(.858*H)),(int(.94*W),int(.858*H))],fill=255,width=3)
        line('CHARMANDER – CHARMELEON',.056,.918,18,.54)
        line('LVL',.597,.907,13,.047); line('16',.599,.922,15,.045)
        line('CHARIZARD',.696,.919,18,.20)
        line('LVL',.912,.907,13,.044); line('36',.914,.922,15,.043)
        line('CHINA',.05,.972,18,.135)
        line('©1999 NINTENDO',.58,.972,18,.37)
        letters=gaussian_filter(np.asarray(text,dtype=float)/255,.9)
        height += ridges*.07*inner + letters*.075
        satin=wing
        height_max=.40
    height *= seam
    # Different finishes have no baked light: cast field, brushed membranes, polished ridges.
    polish = smooth(.06,.5,ridges)
    rough = .265 + .10*satin - .09*polish - .11*raised_rim
    rng=np.random.default_rng(1999006+(side=='back'))
    # Subtle directional tool grain in roughness only; no glitter/no spectral response.
    grain=gaussian_filter(rng.standard_normal((H,W)),(.45,8))
    rough = np.clip(rough + .012*grain,.145,.42)
    # Derive normals before height quantization; finite differences on 8-bit emboss were
    # creating terraces and sparkling dots on the curved belly and thin die lettering.
    dy,dx=np.gradient(gaussian_filter(height, .8)/10,6.985/(H-1),4.445/(W-1))
    normal=np.stack([-dx,dy,np.ones_like(dx)],axis=-1)
    normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
    save(f'{side}-normal',normal*.5+.5)
    save(f'{side}-height',height/height_max)
    save(f'{side}-roughness',rough)
    # Constant metal coverage leaves every part a conductor, including dark recesses.
    save(f'{side}-metallic',np.ones((H,W)))
    return {'referenceCornersPx':corners,'heightRangeMm':height_max,'authoredPeakMm':float(height.max()),
            'roughnessRange':[float(rough.min()),float(rough.max())]}


meta={
    'front':author('front',[(9,10),(304,10),(303,468),(9,468)]),
    'back':author('back',[(323,791),(1093,786),(1110,2000),(337,2004)]),
    'measurementStatus':'Visual reconstruction calibrated against supplied photos and video. Bare thickness and feature heights are not caliper measurements.',
    'baseSlabMm':3.0,
    'sources':{'front':{'kind':'user-supplied','sha256':hashlib.sha256((ROOT/'front.png').read_bytes()).hexdigest()},
               'back':{'kind':'user-supplied','sha256':hashlib.sha256((ROOT/'back.png').read_bytes()).hexdigest()},
               'reverseDetail':{'kind':'supplementary PSA reference scan','url':'https://d1htnxwo4o0jhw.cloudfront.net/cert/202239596/Zh--DiA--US4P4QvtZtCNw.jpg',
                 'sha256':hashlib.sha256((Path(__file__).parent/'references/burger-king/psa-back.jpg').read_bytes()).hexdigest()},
               'video':{'kind':'user-supplied','filename':'2026-09-20 22-40-47.mp4','framesReviewedSeconds':[1,5,10,17,18.5,20,25,30],
                 'notes':'Clear cover remains around the plaque in most views. Bare metal edge is distinguished from that cover; visual scale only.'}},
}
(ROOT/'source.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps(meta,indent=2))
