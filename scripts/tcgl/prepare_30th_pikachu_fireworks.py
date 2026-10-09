"""Author non-etched Pikachu foil from the supplied physical-card example.

Offline optical textures only: no relief, normals, runtime RNG or baked lighting.
The photo establishes motif style; this is a reconstruction, not extracted TCGL
stock or an assertion that every physical copy has identical foil positions.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/cards/pokemon/30th-celebration/pikachu'
SIZE = (1200, 1650)
BURSTS = [(0.817, .728, .192, 144), (-.045, .705, .225, 160),
          (.18, .015, .205, 136), (.79, -.035, .22, 152),
          (.34, 1.08, .255, 168)]

def smooth(a, b, x):
    t = np.clip((x-a)/(b-a), 0, 1)
    return t*t*(3-2*t)

def save(name, values):
    path = OUT / (name + '.png')
    Image.fromarray(np.rint(np.clip(values, 0, 1)*255).astype('uint8')).save(path, optimize=True)
    return hashlib.sha256(path.read_bytes()).hexdigest()

def field(angle, tilt, coverage):
    # Oriented axis avoids half-angle sign seams at the top/bottom of a burst.
    # Coordinates use +Y up, matching tangent space.
    return np.stack(((np.cos(angle)+1)/2, (np.sin(angle)+1)/2,
                     .5 + tilt/1.4, coverage), axis=-1)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    w, h = SIZE
    yy, xx = np.mgrid[0:h, 0:w].astype('float32')
    x, y = (xx+.5)/w, (yy+.5)/h
    angle = np.zeros_like(x); tilt = np.zeros_like(x); strength = np.zeros_like(x)
    for cx, cy, radius, rays in BURSTS:
        dx, dy = (x-cx)*w/h, cy-y
        r = np.hypot(dx, dy); theta = np.arctan2(dy, dx)
        spoke = (.5 + .5*np.cos(theta*rays + r*22))**4
        envelope = smooth(.011, .029, r)*(1-smooth(radius*.70, radius, r))
        coverage = (.16 + .84*spoke)*envelope
        wins = coverage > strength
        angle[wins] = theta[wins]
        tilt[wins] = (.07 + .30*r[wins]/radius + .025*np.sin(theta[wins]*rays))
        strength = np.maximum(strength, coverage)
    outputs = {'fireworks-field': save('fireworks-field', field(angle, tilt, strength))}
    # Fixed irregular flakes, approximately 1–3 reference-image pixels. Their
    # positions never animate; only light and view select the reflected color.
    rng = np.random.default_rng(301430)
    cols, rows = 150, 207
    col = np.minimum((x*cols).astype(int), cols-1); row = np.minimum((y*rows).astype(int), rows-1)
    params = rng.random((rows, cols, 6))
    p = params[row, col]
    fx = x*cols-col-(.08+p[...,0]*.84); fy = y*rows-row-(.08+p[...,1]*.84)
    a = p[...,2]*np.pi*2
    u = fx*np.cos(a)-fy*np.sin(a); v = fx*np.sin(a)+fy*np.cos(a)
    distance = np.maximum(np.abs(u)/(.19+p[...,3]*.20), np.abs(v)/(.14+p[...,4]*.17))
    flakes = (1-smooth(.78, 1.18, distance))*(.65+p[...,5]*.35)
    outputs['speckles-field'] = save('speckles-field', field(a, (p[...,4]-.5)*1.05, flakes))
    text = (ROOT/'src/pokemon/data/30th.generated.ts').read_text(encoding='utf-8')
    records = json.loads(text.split('export const celebrationRecords = ',1)[1].split('] as const',1)[0]+']')
    cards = []
    for card in records:
        if card['rarity'] != 'Pikachu Rare': continue
        stem = card['tcglCardId'].replace('_','-')
        base = ROOT/'public/cards/pokemon/30th-celebration'
        foil_path = base/(stem+'-foil.png'); front_path = ROOT/'public'/card['front'].lstrip('/')
        raw = np.asarray(Image.open(foil_path).convert('RGBA').resize(SIZE, Image.Resampling.BILINEAR),dtype='float32')/255
        front = np.asarray(Image.open(front_path).convert('RGB').resize(SIZE, Image.Resampling.BILINEAR),dtype='float32')/255
        old = np.asarray(Image.open(base/'maps'/(stem+'-protection.png')).resize(SIZE, Image.Resampling.BILINEAR),dtype='float32')/255
        # TCGL white identifies the logo/border; its graded artwork region keeps
        # the source's exact subject protection. The dark reverse is a distinct
        # fireworks stock region, not opaque protection.
        art = (x > .075)&(x < .925)&(y > .094)&(y < .477)
        speckles = raw[...,0]*(1-old)*raw[...,3]
        logo = smooth(.20,.96,raw[...,0])
        # Key the yellow printed substrate outside the art. This preserves each
        # black/white glyph and the silver rules strip without rectangular masks.
        yellow = smooth(.055,.18,front[...,0]-front[...,2])*smooth(.02,.12,front[...,1]-front[...,2])
        yellow *= smooth(.18,.40,front[...,0])
        fireworks = yellow*(1-logo)*(~art)*raw[...,3]
        protection = np.zeros_like(x)  # Print exclusion is baked into each coverage PNG.
        roughness = .36-.07*np.maximum(fireworks,speckles)
        hashes = {kind:save(stem+'-'+kind, value) for kind,value in
                  [('fireworks',fireworks),('speckles',speckles),('protection',protection),('roughness',roughness)]}
        cards.append({'id':card['id'],'tcglVariantId':card['tcglVariantId'],
                      'sourceFoilSha256':hashlib.sha256(foil_path.read_bytes()).hexdigest(),
                      'sourceFrontSha256':hashlib.sha256(front_path.read_bytes()).hexdigest(),'outputs':hashes})
    evidence = {'method':'Offline optical reconstruction from user-supplied example; not TCGL stock extraction',
        'reference':'codex-clipboard-db283134-7b89-48c4-ad80-14adc494b507.png',
        'referenceSha256':'fe92fe83ef6ac6804e9a12ccf6ef2321b0dd0a7bd0c4bd1a19dfafa4123c6ffe',
        'regions':'Rainbow flakes in Pikachu silhouette and existing artwork/border foil; fine radial fireworks in yellow reverse',
        'dimensions':SIZE,'bursts':BURSTS,'fields':outputs,'encoding':'RG oriented axis, B signed optical inclination / 1.4 + 0.5, A motif coverage',
        'relief':'None. No height/normal generation or emboss.',
        'limitations':'Single flat photo; physical angular match and copy-specific motif positions are not established.',
        'cards':cards}
    (OUT/'evidence.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8')
    print(f'Authored fireworks and separate speckles for {len(cards)} Pikachu printings')

if __name__ == '__main__': main()
