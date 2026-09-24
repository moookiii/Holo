"""Build exact-card regular-holo coverage; no scan-derived relief or foil guessing.

Only photographed shared frame geometry is reused. Subject and foreground paths
are authored separately in regular-regions.json. Optional white-ink extraction
is limited to explicitly authored printed-petal rectangles, never the whole art.
"""
from pathlib import Path
import argparse
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from coverage_raster import contour, rectangle

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/cards/pokemon/prismatic-evolutions'
DATA = json.loads(Path(__file__).with_name('regular-regions.json').read_text())
REFERENCES = json.loads((ROOT / 'research/prismatic-evolutions/references.json').read_text())
EVOLUTION = 'M14 25 Q17 21 27 22 L114 22 Q108 43 96 51 L94 66 Q119 96 101 126 Q84 151 54 152 Q17 151 8 116 L8 64 Z'
SCALE = 4
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cards', nargs='+', choices=list(DATA['cards']), help='Build only these exact printings')
args = parser.parse_args()

for number, regions in DATA['cards'].items():
    if args.cards and number not in args.cards:
        continue
    assert regions['frame'] == 'stage-one', 'Author a distinct frame for other layouts'
    foil = Image.new('L', (600*SCALE, 825*SCALE))
    draw = ImageDraw.Draw(foil)
    rectangle(draw, (0, 0, 600, 825), 255, 25)
    rectangle(draw, (23, 23, 577, 802), 0, 11)
    picture = Image.new('L', foil.size)
    art = ImageDraw.Draw(picture)
    rectangle(art, (49, 94, 552, 389), 255)
    for path in regions['exclude']:
        contour(art, path, 0)
    for path in regions['windows']:
        contour(art, path, 255)
    bounds = tuple(value*SCALE for value in (49, 94, 552, 389))
    foil.paste(picture.crop(bounds), bounds[:2])
    contour(draw, EVOLUTION, 0)
    output = ASSETS / 'maps'
    foil_path = output / f'{number}-holo-foil.png'
    foil.resize((1200, 1650), Image.Resampling.LANCZOS).save(foil_path, optimize=True)

    front = np.array(Image.open(ASSETS / f'{number}.png').convert('RGBA').convert('RGB'), dtype=np.float32)
    protection = np.zeros(front.shape[:2], dtype=np.uint8)
    footer = front[804:818, 175:429].mean(axis=2)
    protection[804:818, 175:429] = np.uint8(np.clip((150-footer)/140, 0, 1)*255)
    for x0, y0, x1, y1 in regions['whiteInkRegions']:
        ink = front[y0:y1, x0:x1].min(axis=2)
        protection[y0:y1, x0:x1] = np.uint8(np.clip((ink-180)/60, 0, 1)*255)
    Image.fromarray(protection).resize((1200, 1650), Image.Resampling.LANCZOS).save(output / f'{number}-holo-protection.png')
    photos = [p for p in REFERENCES['photos'] if p['cardId'] == f'sv08.5-{number}' and p['variant'] == 'holo' and p['assessment'] == 'partial-surface']
    assert photos, f'Missing exact-card evidence: {number}'
    files = [foil_path.name, f'{number}-holo-protection.png']
    evidence = {'cardId': f'sv08.5-{number}', 'variant': 'holo', 'textured': False,
        'front': f'https://assets.tcgdex.net/en/sv/sv08.5/{number}/high.png',
        'references': [{'file': p['file'], 'sha256': hashlib.sha256((ROOT / 'research/prismatic-evolutions/photos' / p['file']).read_bytes()).hexdigest(), 'listing': f'https://www.ebay.com/itm/{p["listing"]}', 'image': f'https://i.ebayimg.com/images/g/{p["imageKey"]}/s-l1600.webp', 'observed': p['notes']} for p in photos],
        'authoring': regions['observed'] + ' Exact authored contours in regular-regions.json rasterized directly to antialiased grayscale PNG. No path or print pixels become height, normal or relief data.',
        'limitations': 'Still-photo coverage reconstruction; grating constants and physical depth are not measured. Optical response uses the regular-holo family; moving-reference calibration remains pending.',
        'maps': {file: hashlib.sha256((output / file).read_bytes()).hexdigest() for file in files}}
    (output / f'{number}-holo-evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(f'{number} {regions["name"]}: authored subject and {len(regions["windows"])} foreground foil openings')
