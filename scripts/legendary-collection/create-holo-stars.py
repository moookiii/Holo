"""LC-specific registered foil motifs, independently authored from reused cutouts.

Coordinates refer to the 600x825 LC fronts. Hollow four-point stars retain a
dark central aperture; they are not cosmos discs or filled eight-ray stars.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/cards/pokemon/legendary-collection'
REVIEW = ROOT / 'artifacts/legendary-collection-cutouts'
REVIEW.mkdir(parents=True, exist_ok=True)
placements = json.loads(Path(__file__).with_name('holo-star-placements.json').read_text())
yy, xx = np.mgrid[:3300, :2400].astype(np.float32)
xx = (xx + .5) / 4
yy = (yy + .5) / 4
for number, stars in placements.items():
    mask = np.zeros(xx.shape, np.uint8)
    for star in stars:
        a = abs((xx - star['x']) / star['rx'])
        b = abs((yy - star['y']) / star['ry'])
        if star['kind'] == 'hollow':
            # Concave diamond perimeter with four tapering arms. Subtracting
            # the inner diamond preserves the visible transparent center.
            outer = (np.sqrt(a) + np.sqrt(b)) <= 1
            aperture = (a + b) < .14
            shape = outer & ~aperture
        else:
            da = abs(((xx-star['x'])/star['rx'] + (yy-star['y'])/star['ry']) / 2**.5)
            db = abs(((yy-star['y'])/star['ry'] - (xx-star['x'])/star['rx']) / 2**.5)
            shape = np.minimum.reduce([a+b/.16, a/.16+b,
                da/.58+db/.16, da/.16+db/.58, np.hypot(a,b)/.20]) <= 1
        mask[shape] = 255
    result = Image.fromarray(mask).resize((1200,1650), Image.Resampling.LANCZOS)
    result.save(ASSETS / 'maps' / f'{number}-holo-stars.png', optimize=True)
    clean = Image.open(ASSETS / f'{number}.png').convert('RGB').resize(result.size)
    Image.composite(Image.new('RGB', result.size, (255,40,160)), clean,
        result.point(lambda value: int(value*.8))).crop((100,180,1100,870)).save(REVIEW / f'{number}-stars-overlay.png')
    for star in stars:
        if star['kind'] == 'hollow':
            assert result.getpixel((2*star['x'],2*star['y'])) < 8
    print(f'LC {number}: {len(stars)} registered motifs')
