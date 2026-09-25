"""Implement photo-reviewed full-art ink/foil coverage before relief is finished.

No height, normal or direction is generated here. Only manually bounded printed
typography uses front pixels. The exact-card opaque contours are vector paths.
"""
from pathlib import Path
import hashlib
import json
import re
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import maximum_filter, binary_fill_holes, label, binary_dilation

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/cards/pokemon/prismatic-evolutions'
DATA = json.loads(Path(__file__).with_name('fullart-regions.json').read_text())
REFERENCES = json.loads((ROOT / 'research/prismatic-evolutions/references.json').read_text())
PHOTOS = {p['file']: p for p in REFERENCES['photos']}
SCALE = 4


def draw_contour(draw, contour, value):
    """Rasterize authored closed contours with subpixel edge antialiasing.

    Coordinates stay in the 600x825 print master. Curves describe coverage
    boundaries only; they are never used to invent physical etched linework.
    """
    tokens = re.findall(r'[MLQCZ]|-?\d*\.?\d+', contour)
    cursor, points, current = 0, [], np.zeros(2)
    while cursor < len(tokens):
        command = tokens[cursor]
        cursor += 1
        if command == 'Z':
            if len(points) < 3:
                raise ValueError('A coverage contour needs at least three points')
            draw.polygon([(round(x*SCALE), round(y*SCALE)) for x, y in points], fill=value)
            points = []
            continue
        count = {'M': 2, 'L': 2, 'Q': 4, 'C': 6}[command]
        controls = np.array([float(v) for v in tokens[cursor:cursor+count]]).reshape(-1, 2)
        cursor += count
        if command in ('M', 'L'):
            points.append(tuple(controls[0]))
        else:
            for t in np.linspace(0, 1, 64)[1:]:
                point = ((1-t)**2*current + 2*(1-t)*t*controls[0] + t*t*controls[1]) if command == 'Q' else ((1-t)**3*current + 3*(1-t)**2*t*controls[0] + 3*(1-t)*t*t*controls[1] + t**3*controls[2])
                points.append(tuple(point))
        current = controls[-1]
    if points:
        raise ValueError('Coverage contours must be explicitly closed')

for number, regions in DATA['cards'].items():
    foil = Image.new('L', (600*SCALE, 825*SCALE))
    draw = ImageDraw.Draw(foil)
    draw.rounded_rectangle((0, 0, foil.width-1, foil.height-1), radius=25*SCALE, fill=255)
    for region in regions['opaqueRegions']:
        draw_contour(draw, region['path'], 0)
    # Small transmissive features can sit inside a protected area. Keep these
    # explicit and card-specific; never infer foil from dark artwork pixels.
    for region in regions.get('foilIslands', []):
        draw_contour(draw, region['path'], 255)
    output = ASSETS / 'maps'
    foil_path = output / f'{number}-holo-foil.png'
    foil.resize((1200, 1650), Image.Resampling.LANCZOS).save(foil_path, optimize=True)

    rgb = np.asarray(Image.open(ASSETS / f'{number}.png').convert('RGBA').convert('RGB'), dtype=np.float32)
    protection = np.zeros((825, 600), dtype=np.float32)
    for x0, y0, x1, y1 in regions['blackGlyphRegions']:
        darkness = rgb[y0:y1, x0:x1].max(axis=2)
        protection[y0:y1, x0:x1] = np.maximum(protection[y0:y1, x0:x1], np.clip((155-darkness)/110, 0, 1))
    for x0, y0, x1, y1 in regions['outlinedGlyphRegions']:
        # Include ascenders above the old row bounds; derive outlines only from
        # isolated dark glyph cores, never from pale artwork across a text row.
        y0=max(0,y0-5); y1=min(825,y1+3)
        patch = rgb[y0:y1, x0:x1]
        white = np.clip((patch.min(axis=2)-185)/55, 0, 1)
        dark = patch.max(axis=2) < 105
        components,count=label(dark)
        core=np.zeros(dark.shape,dtype=bool)
        for component in range(1,count+1):
            candidate=components==component
            cy,cx=np.nonzero(candidate)
            if len(cx)<2 or cx.max()-cx.min()>22 or cy.max()-cy.min()>24:
                continue
            rim=binary_dilation(candidate,iterations=2) & ~candidate
            # Printed black letters have a bright outline around most of their
            # perimeter. Dark forest and clothing edges do not.
            if float(np.mean(white[rim]>.1)) < .35:
                continue
            core|=candidate
        outline=white*(maximum_filter(core,size=5)>0)
        glyph=np.maximum(outline,binary_fill_holes((outline>.2)|core))
        protection[y0:y1, x0:x1] = np.maximum(protection[y0:y1, x0:x1], glyph)
    protection_path = output / f'{number}-holo-protection.png'
    Image.fromarray(np.rint(np.clip(protection, 0, 1)*255).astype(np.uint8)).resize((1200, 1650), Image.Resampling.LANCZOS).save(protection_path)

    evidence = []
    for filename in regions['photoFiles']:
        photo = PHOTOS[filename]
        assert photo['cardId'] == f'sv08.5-{number}' and photo['variant'] == 'holo'
        assert photo['assessment'] == 'partial-surface'
        provenance = ({'listing': f'https://www.ebay.com/itm/{photo["listing"]}',
                       'image': f'https://i.ebayimg.com/images/g/{photo["imageKey"]}/s-l1600.webp'}
                      if 'listing' in photo else {'source': photo['source']})
        evidence.append({'file': filename, **provenance,
                         'sha256': hashlib.sha256((ROOT / 'research/prismatic-evolutions/photos' / filename).read_bytes()).hexdigest(),
                         'observed': photo['notes']})
    manifest = {'cardId': f'sv08.5-{number}', 'variant': 'holo', 'profile': regions['profile'],
                'status': 'coverage-only', 'textured': True, 'rendererReady': False,
                'references': evidence, 'authoring': regions['observed'], 'remaining': regions['remaining'],
                'limitations': 'Coverage reconstruction from still photos. No etching map, measured grating constant or completed surface is claimed.',
                'opaqueRegions': [r['name'] for r in regions['opaqueRegions']],
                'foilIslands': [{key: r[key] for key in ('name', 'observed')} for r in regions.get('foilIslands', [])],
                'maps': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (foil_path, protection_path)}}
    (output / f'{number}-holo-evidence.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print(f'{number} {regions["name"]}: foil/protection implemented; etched surface remains pending')
