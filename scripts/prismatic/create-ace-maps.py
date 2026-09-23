"""Reproducible exact-printing ACE SPEC coverage and print protection.

Only the photographed common frame shares geometry. Objects and transmissive
windows come from ace-regions.json, measured on each unmodified 600x825 front.
White glyph extraction is confined to authored text rectangles; no picture
luminance is interpreted as foil, normals, etching or height.
"""
from pathlib import Path
import hashlib
import json
import re
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/cards/pokemon/prismatic-evolutions'
DATA = json.loads(Path(__file__).with_name('ace-regions.json').read_text())
REFERENCES = json.loads((ROOT / 'research/prismatic-evolutions/references.json').read_text())
SCALE, SIZE = 3, (1800, 2475)


def path_points(path):
    """Absolute M/L/Q/C/Z sampler, matching the existing map authoring scripts."""
    tokens = re.findall(r'[MLQCZ]|-?\d*\.?\d+', path)
    i, result, current = 0, [], np.zeros(2)
    while i < len(tokens):
        op = tokens[i]
        i += 1
        if op == 'Z':
            result.append(result[0])
            continue
        count = {'M': 2, 'L': 2, 'Q': 4, 'C': 6}[op]
        a = np.array([float(v) for v in tokens[i:i + count]]).reshape(-1, 2)
        i += count
        if op in ('M', 'L'):
            result.append(tuple(a[0]))
        else:
            for t in np.linspace(0, 1, 40)[1:]:
                q = ((1-t)**2*current + 2*(1-t)*t*a[0] + t*t*a[1]) if op == 'Q' else ((1-t)**3*current + 3*(1-t)**2*t*a[0] + 3*(1-t)*t*t*a[1] + t**3*a[2])
                result.append(tuple(q))
        current = a[-1]
    return [(round(x*SCALE), round(y*SCALE)) for x, y in result]


def polygon(draw, path, value):
    draw.polygon(path_points(path), fill=value)


def rect(draw, bounds, value, radius=0):
    draw.rounded_rectangle(tuple(round(v*SCALE) for v in bounds), radius=radius*SCALE, fill=value)


for number, regions in DATA['cards'].items():
    foil = Image.new('L', SIZE)
    draw = ImageDraw.Draw(foil)
    rect(draw, (0, 0, 599, 824), 255, 25)
    # Carbon-colored inner rail and footer are opaque; colored ACE rails overlay it.
    rect(draw, (23, 113, 577, 803), 0, 9)
    rect(draw, (49, 119, 551, 426), 255)
    polygon(draw, 'M61 432 L546 432 L546 714 L552 719 L242 719 Q213 720 194 739 L34 739 Q24 739 24 729 L24 697 L61 721 Z', 255)
    polygon(draw, 'M15 350 L61 393 L61 721 L15 680 Z', 255)
    polygon(draw, 'M543 189 L585 244 L585 753 L547 718 L547 473 L543 469 Z', 255)
    # Opaque top metallic-looking print strip. Its magenta TRAINER lettering
    # alone transmits the sheet; that ink channel is restored below.
    polygon(draw, 'M41 19 L583 19 Q594 23 589 40 Q587 53 573 57 L24 57 Q10 57 13 42 Q19 20 41 19 Z', 0)
    for path in regions['exclude']:
        polygon(draw, path, 0)
    for window in regions['windows']:
        polygon(draw, window['path'], window['value'])
    # Straps, cables and hardware can cross an otherwise transmissive window.
    for path in regions.get('opaqueDetails', []):
        polygon(draw, path, 0)
    front = np.asarray(Image.open(ASSETS / f'{number}.png').convert('RGBA').convert('RGB'), dtype=np.float32)
    foil_array = np.array(foil.resize((1200, 1650), Image.Resampling.LANCZOS))
    banner = np.zeros((825, 600), dtype=np.uint8)
    ink = front[24:53, 381:575]
    banner[24:53, 381:575] = np.uint8(np.clip((ink[:, :, 0] - ink[:, :, 1] - 40) / 110, 0, 1) * 255)
    banner = np.asarray(Image.fromarray(banner).resize((1200, 1650), Image.Resampling.LANCZOS))
    foil_array = np.maximum(foil_array, banner)

    protection = np.zeros((825, 600), dtype=np.uint8)
    for x0, y0, x1, y1 in [(32, 65, 555, 105), (69, 480, 535, 640), (550, 495, 576, 711)]:
        ink = front[y0:y1, x0:x1].min(axis=2)
        protection[y0:y1, x0:x1] = np.uint8(np.clip((ink - 175) / 65, 0, 1) * 255)
    footer = front[805:818, 175:429].mean(axis=2)
    protection[805:818, 175:429] = np.uint8(np.clip((95 - footer) / 70, 0, 1) * 255)
    output = ASSETS / 'maps'
    Image.fromarray(foil_array).save(output / f'{number}-holo-foil.png', optimize=True)
    Image.fromarray(protection).resize((1200, 1650), Image.Resampling.LANCZOS).save(output / f'{number}-holo-protection.png', optimize=True)
    photos = [p for p in REFERENCES['photos'] if p['cardId'] == f'sv08.5-{number}' and p['variant'] == 'holo' and p['assessment'] == 'partial-surface']
    assert photos, f'Missing exact-card evidence: {number}'
    evidence = {'cardId': f'sv08.5-{number}', 'variant': 'holo', 'textured': False,
        'front': f'https://assets.tcgdex.net/en/sv/sv08.5/{number}/high.png',
        'references': [{'listing': f'https://www.ebay.com/itm/{p["listing"]}', 'image': f'https://i.ebayimg.com/images/g/{p["imageKey"]}/s-l1600.webp', 'observed': p['notes']} for p in photos],
        'foilWindows': [w['name'] for w in regions['windows']],
        'authoring': 'Shared photographed ACE frame; individual object contours and internal foil windows from ace-regions.json. White name, rules and rail lettering are protected per card. No subject contour is used as relief.',
        'limitations': 'Still-photo optical reconstruction, not measured grating constants. No raised or etched texture is inferred.',
        'maps': {f'{number}-holo-{kind}.png': hashlib.sha256((output / f'{number}-holo-{kind}.png').read_bytes()).hexdigest() for kind in ('foil', 'protection')}}
    (output / f'{number}-holo-evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(f'{number} {regions["name"]}: {len(regions["windows"])} authored internal foil windows')
