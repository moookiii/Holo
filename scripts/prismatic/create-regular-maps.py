"""Build exact-card regular-holo coverage; no scan-derived relief or foil guessing.

Only photographed shared frame geometry is reused. Subject and foreground paths
are authored separately in regular-regions.json. Optional white-ink extraction
is limited to explicitly authored printed-petal rectangles, never the whole art.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/cards/pokemon/prismatic-evolutions'
DATA = json.loads(Path(__file__).with_name('regular-regions.json').read_text())
REFERENCES = json.loads((ROOT / 'research/prismatic-evolutions/references.json').read_text())
EVOLUTION = 'M14 25 Q17 21 27 22 L114 22 Q108 43 96 51 L94 66 Q119 96 101 126 Q84 151 54 152 Q17 151 8 116 L8 64 Z'

for number, regions in DATA['cards'].items():
    assert regions['frame'] == 'stage-one', 'Author a distinct frame for other layouts'
    svg = ET.Element('svg', xmlns='http://www.w3.org/2000/svg', width='1200', height='1650', viewBox='0 0 600 825')
    ET.SubElement(svg, 'title').text = f'{regions["name"]} {number}/131 regular holo coverage, not relief'
    ET.SubElement(svg, 'rect', width='600', height='825', fill='black')
    ET.SubElement(svg, 'rect', width='600', height='825', rx='25', fill='white')
    ET.SubElement(svg, 'rect', x='23', y='23', width='554', height='779', rx='11', fill='black')
    definitions = ET.SubElement(svg, 'defs')
    clip = ET.SubElement(definitions, 'clipPath', id='picture')
    ET.SubElement(clip, 'rect', x='49', y='94', width='503', height='295')
    picture = ET.SubElement(svg, 'g', {'clip-path': 'url(#picture)'})
    ET.SubElement(picture, 'rect', x='49', y='94', width='503', height='295', fill='white')
    for path in regions['exclude']:
        ET.SubElement(picture, 'path', d=path, fill='black')
    for path in regions['windows']:
        ET.SubElement(picture, 'path', d=path, fill='white')
    ET.SubElement(svg, 'path', d=EVOLUTION, fill='black')
    output = ASSETS / 'maps'
    ET.indent(svg, space='  ')
    foil_path = output / f'{number}-holo-foil.png'
    with tempfile.TemporaryDirectory() as temporary:
        vector_path = Path(temporary) / 'coverage.svg'
        vector_path.write_text(ET.tostring(svg, encoding='unicode') + '\n', encoding='utf-8')
        subprocess.run(['magick', '-background', 'black', str(vector_path), '-type', 'Grayscale', '-depth', '8', str(foil_path)], check=True)

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
        'references': [{'listing': f'https://www.ebay.com/itm/{p["listing"]}', 'image': f'https://i.ebayimg.com/images/g/{p["imageKey"]}/s-l1600.webp', 'observed': p['notes']} for p in photos],
        'authoring': regions['observed'] + ' Exact vector contours in regular-regions.json. No path or print pixels become height, normal or relief data.',
        'limitations': 'Still-photo coverage reconstruction; grating constants and physical depth are not measured. Optical response uses the regular-holo family; moving-reference calibration remains pending.',
        'maps': {file: hashlib.sha256((output / file).read_bytes()).hexdigest() for file in files}}
    (output / f'{number}-holo-evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(f'{number} {regions["name"]}: authored subject and {len(regions["windows"])} foreground foil openings')
