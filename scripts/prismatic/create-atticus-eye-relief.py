"""Author Atticus's small eye-area foil islands from observed regional flow.

The user authorized inferred line placement on these features on 2026-09-24.
This is a regional reconstruction, not a claim of exact ridge correspondence.
The rest of Atticus's relief is not represented by these partial maps.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from coverage_raster import contour
from etched_maps import build_maps

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'research/prismatic-evolutions/relief/133-eye'


def build():
    card = json.loads(Path(__file__).with_name('fullart-regions.json').read_text())['cards']['133']
    labels_image = Image.new('L', (1200, 1650))
    draw = ImageDraw.Draw(labels_image)
    for label, island in enumerate(card['foilIslands'], 1):
        contour(draw, island['path'], label, scale=2)
    labels = np.asarray(labels_image)
    foil = np.where(labels > 0, 255, 0).astype(np.uint8)
    # Regional guide curves follow the long eyebrow and curved upper lid.
    # Spacing/phase are inferred, not copied from ink brightness or noise.
    brow = [[370, 194], [378, 193], [386, 195], [394, 198.4], [403, 203.2], [417, 212.6]]
    lid = [[357, 224], [367, 218.3], [375, 215.3], [383, 213.8], [391, 214], [399, 217], [406, 222], [414, 229]]
    regions = []
    for label, (name, curve, offsets) in enumerate([
        ('Eyebrow longitudinal flow', brow, [-2.4, -1.2, 0, 1.2, 2.4, 3.6]),
        ('Upper lid and lashes curved flow', lid, [-7.2, -6, -4.8, -3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6]),
    ], 1):
        regions.append({'label': label, 'name': name, 'kind': 'etched', 'roughness': .39,
            'lines': [{'points': [[x, y+offset] for x, y in curve],
                'halfWidthMicrons': 40, 'ridgeMicrons': 1.5, 'valleyMicrons': .55,
                'relativeGratingPeriod': 1} for offset in offsets]})
    spec = {'version': 1, 'mapSize': [1200, 1650], 'coordinates': [600, 825],
        'dimensionsCm': [6.3, 8.8], 'heightRangeMicrons': 4, 'regions': regions}
    maps = build_maps(spec, foil, np.zeros_like(foil), labels)
    # A partial export is deliberately kept outside the production card maps.
    OUT.mkdir(parents=True, exist_ok=True)
    for name, array in {**maps, 'regions': labels}.items():
        Image.fromarray(array).save(OUT / f'{name}.png')
    outside = labels == 0
    assert np.all(maps['height'][outside] == 128)
    assert np.all(maps['normal'][outside] == [128, 128, 255])
    assert np.all(maps['direction'][outside, 3] == 0)
    assert all(np.any(maps['height'][labels == n] != 128) for n in (1, 2))
    photos = ['atticus-133-user-01.png', 'atticus-133-g.webp', 'atticus-133-j.webp']
    evidence = {'cardId': 'sv08.5-133', 'variant': 'holo',
        'status': 'partial-regional-reconstruction', 'rendererReady': False,
        'authoring': 'User-authorized inference of eyebrow/lash directional flow from existing exact-card photos. Curved ridges are clipped to separately authored foil islands. Positions, spacing and calibrated depth are approximate; no per-ridge photographic match is claimed.',
        'depthCalibration': 'Restrained 1.5 micrometre ridges and 0.55 micrometre valleys are rendering calibration, not measured physical depth.',
        'references': [{'photo': name, 'sha256': hashlib.sha256((ROOT/'research/prismatic-evolutions/photos'/name).read_bytes()).hexdigest()} for name in photos],
        'spec': spec,
        'maps': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.glob('*.png') if not p.name.startswith('preview-')}}
    (OUT/'evidence.json').write_text(json.dumps(evidence, indent=2)+'\n')
    # Directional-light detail studies use the exported normal and mask, with
    # unchanged print outside the foil islands. No photo pixels supply relief.
    front = np.asarray(Image.open(ROOT/'public/cards/pokemon/prismatic-evolutions/133.png').convert('RGBA').convert('RGB').resize((1200,1650)), dtype=float)/255
    normal = maps['normal'].astype(float)/127.5-1
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    for name, direction in [('left', [-.13,.09,1]), ('right', [.13,-.09,1]), ('top', [0,.16,1])]:
        light = np.array(direction); light /= np.linalg.norm(light)
        response = np.maximum(0, normal @ light)**90
        flat = light[2]**90
        strength = (response-flat)*.6
        result = front.copy()
        active = labels > 0
        result[active] = np.clip(front[active]+strength[active,None], 0, 1)
        Image.fromarray(np.rint(result*255).astype(np.uint8)).crop((680,370,850,530)).resize((680,640)).save(OUT/f'preview-{name}.png')
    print('Atticus eyebrow/lashes: regional PNG relief, normals, direction and three light studies; skin/eye remain flat')


if __name__ == '__main__':
    build()
