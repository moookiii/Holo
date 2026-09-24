"""Implement photo-reviewed full-art ink/foil coverage before relief is finished.

No height, normal or direction is generated here. Only manually bounded printed
typography uses front pixels. The exact-card opaque contours are vector paths.
"""
from pathlib import Path
import hashlib
import json
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image
from scipy.ndimage import maximum_filter, binary_fill_holes

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/cards/pokemon/prismatic-evolutions'
DATA = json.loads(Path(__file__).with_name('fullart-regions.json').read_text())
REFERENCES = json.loads((ROOT / 'research/prismatic-evolutions/references.json').read_text())
PHOTOS = {p['file']: p for p in REFERENCES['photos']}

for number, regions in DATA['cards'].items():
    svg = ET.Element('svg', xmlns='http://www.w3.org/2000/svg', width='1200', height='1650', viewBox='0 0 600 825')
    ET.SubElement(svg, 'title').text = f'{regions["name"]} {number}/131 full-art foil coverage only; etched relief pending'
    ET.SubElement(svg, 'rect', width='600', height='825', fill='black')
    ET.SubElement(svg, 'rect', width='600', height='825', rx='25', fill='white')
    for region in regions['opaqueRegions']:
        path = ET.SubElement(svg, 'path', d=region['path'], fill='black')
        ET.SubElement(path, 'title').text = region['name']
    ET.indent(svg, space='  ')
    output = ASSETS / 'maps'
    foil_path = output / f'{number}-holo-foil.svg'
    foil_path.write_text(ET.tostring(svg, encoding='unicode') + '\n', encoding='utf-8')

    rgb = np.asarray(Image.open(ASSETS / f'{number}.png').convert('RGBA').convert('RGB'), dtype=np.float32)
    protection = np.zeros((825, 600), dtype=np.float32)
    for x0, y0, x1, y1 in regions['blackGlyphRegions']:
        darkness = rgb[y0:y1, x0:x1].max(axis=2)
        protection[y0:y1, x0:x1] = np.maximum(protection[y0:y1, x0:x1], np.clip((155-darkness)/110, 0, 1))
    for x0, y0, x1, y1 in regions['outlinedGlyphRegions']:
        patch = rgb[y0:y1, x0:x1]
        white = np.clip((patch.min(axis=2)-185)/55, 0, 1)
        dark = patch.max(axis=2) < 105
        # White glyph outlines enclose their black printed core. Retain the
        # enclosed ink and immediate edge, not every dark artwork pixel in a row.
        enclosed = binary_fill_holes(white > .45)
        core = dark & (enclosed | (maximum_filter(white, size=3) > .6))
        protection[y0:y1, x0:x1] = np.maximum(protection[y0:y1, x0:x1], np.maximum(white, core))
    protection_path = output / f'{number}-holo-protection.png'
    Image.fromarray(np.rint(np.clip(protection, 0, 1)*255).astype(np.uint8)).resize((1200, 1650), Image.Resampling.LANCZOS).save(protection_path)

    evidence = []
    for filename in regions['photoFiles']:
        photo = PHOTOS[filename]
        assert photo['cardId'] == f'sv08.5-{number}' and photo['variant'] == 'holo'
        assert photo['assessment'] == 'partial-surface'
        evidence.append({'file': filename, 'listing': f'https://www.ebay.com/itm/{photo["listing"]}',
                         'image': f'https://i.ebayimg.com/images/g/{photo["imageKey"]}/s-l1600.webp',
                         'sha256': hashlib.sha256((ROOT / 'research/prismatic-evolutions/photos' / filename).read_bytes()).hexdigest(),
                         'observed': photo['notes']})
    manifest = {'cardId': f'sv08.5-{number}', 'variant': 'holo', 'profile': regions['profile'],
                'status': 'coverage-only', 'textured': True, 'rendererReady': False,
                'references': evidence, 'authoring': regions['observed'], 'remaining': regions['remaining'],
                'limitations': 'Coverage reconstruction from still photos. No etching map, measured grating constant or completed surface is claimed.',
                'opaqueRegions': [r['name'] for r in regions['opaqueRegions']],
                'maps': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (foil_path, protection_path)}}
    (output / f'{number}-holo-evidence.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print(f'{number} {regions["name"]}: foil/protection implemented; etched surface remains pending')
