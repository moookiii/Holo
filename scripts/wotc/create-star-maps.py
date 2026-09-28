"""Rasterize individually measured WotC stars; never derive relief from scans.

star-placements.json uses x, y, horizontal radius, vertical radius in the
600x825 clean front. Existing foil/protection maps remain authoritative.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SLUGS = 'alakazam blastoise chansey charizard clefairy gyarados hitmonchan machamp magneton mewtwo nidoking ninetales poliwrath raichu venusaur zapdos'.split()
DATA = json.loads((Path(__file__).parent / 'star-placements.json').read_text())
OUT = ROOT / 'artifacts/star-registration'
OUT.mkdir(parents=True, exist_ok=True)

for key, stars in DATA.items():
    if len(sys.argv) > 1 and key not in sys.argv[1:]:
        continue
    series, number = key.split('-')
    n = int(number)
    if series == 'base1':
        folder = ROOT / ('public/cards/charizard-base-set' if n == 4 else f'public/cards/pokemon/base-set/{SLUGS[n-1]}')
        front, target = folder / 'front.png', folder / 'stars.png'
    else:
        folder = ROOT / f"public/cards/pokemon/{'fossil' if series == 'base3' else 'jungle'}"
        front, target = folder / f'{n}.png', folder / f'maps/{n}-stars.png'
    # Four samples per delivered pixel; PNG masks are 1200x1650.
    scale = 4
    yy, xx = np.mgrid[:825*scale, :600*scale].astype(np.float32)
    xx = (xx + .5) / scale
    yy = (yy + .5) / scale
    mask = np.zeros(xx.shape, np.float32)
    for x, y, rx, ry in stars:
        a, b = (xx-x)/rx, (yy-y)/ry
        da, db = (a+b)/2**.5, (b-a)/2**.5
        # Same narrow eight-ray motif as Star Holo: Base Set, sized to the scan.
        distance = np.minimum.reduce([abs(a)+abs(b)/.16, abs(a)/.16+abs(b),
            abs(da)/.58+abs(db)/.16, abs(da)/.16+abs(db)/.58,
            np.hypot(a,b)/.20])
        mask = np.maximum(mask, (distance <= 1).astype(np.float32))
    im = Image.fromarray(np.uint8(mask*255)).resize((1200,1650), Image.Resampling.LANCZOS)
    im.save(target, optimize=True)
    scan = Image.open(front).convert('RGB').resize((1200,1650))
    tint = Image.new('RGB',scan.size,(255,40,160))
    preview = Image.composite(tint,scan,im.point(lambda v: int(v*.65)))
    draw = ImageDraw.Draw(preview)
    for i,(x,y,rx,ry) in enumerate(stars):
        draw.ellipse((2*x-3,2*y-3,2*x+3,2*y+3),outline='cyan')
        draw.text((2*(x+rx)+3,2*y),str(i+1),fill='cyan')
    preview.crop((100,180,1100,870)).save(OUT / f'{key}-overlay.png')
print(f'Wrote {len(DATA)} PNG maps with {sum(map(len,DATA.values()))} registered stars.')
