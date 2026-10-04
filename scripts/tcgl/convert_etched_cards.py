"""Apply the documented Sylveon conversion to reviewed exact TCGL etches.

python scripts/tcgl/convert_etched_cards.py [--card sv08.5-144]
Sources must first be visually inspected with review_sources.py. The explicit
--record-source-review option records that completed review for this migration.
No network access or runtime work is part of normal conversion.
"""
from pathlib import Path
import argparse
import ast
import hashlib
import json
import re
from io import BytesIO
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = Path(__file__).with_name('etched_cards.json')
SIZE = (1800, 2475)
SLOPE_GAIN = 1.03


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dump(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def save_png(path, image):
    buffer = BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    data = buffer.getvalue()
    if path.exists() and path.read_bytes() == data:
        return
    temporary = path.with_name(path.name + '.tcgl-tmp')
    temporary.write_bytes(data)
    temporary.replace(path)


def map_path(card, name):
    return ROOT / (card['mapPrefix'] + name + '.png')


def grayscale(path, optional=False):
    if optional and not path.exists():
        return np.zeros((SIZE[1], SIZE[0]), dtype=np.float32)
    data = np.asarray(Image.open(path).convert('L'), dtype=np.float32) / 255.0
    return cv2.resize(data, SIZE, interpolation=cv2.INTER_LINEAR)


def preserve_pikachu_body(card):
    """Rasterize the existing authored contour; no image segmentation or relief.

    The earlier generator kept its BODY path in code but emitted no body PNG.
    Reuse that exact boundary for the reference roughness recipe.
    """
    if card['id'] != 'swsh4-188' or map_path(card, 'body').exists():
        return
    tree = ast.parse((ROOT / 'scripts/create-pikachu-vmax-maps.py').read_text())
    path = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign)
                and any(isinstance(t, ast.Name) and t.id == 'BODY' for t in n.targets))
    tokens = re.findall(r'[MLQCZ]|-?\d*\.?\d+', path)
    i, points, p = 0, [], np.zeros(2)
    while i < len(tokens):
        op = tokens[i]
        i += 1
        if op == 'Z':
            points.append(points[0])
            continue
        count = {'M': 2, 'L': 2, 'Q': 4, 'C': 6}[op]
        a = np.array([float(v) for v in tokens[i:i + count]]).reshape(-1, 2)
        i += count
        if op in ('M', 'L'):
            points.append(tuple(a[0]))
            p = a[0]
            continue
        for t in np.linspace(0, 1, 80)[1:]:
            q = ((1-t)**2*p + 2*(1-t)*t*a[0] + t*t*a[1]) if op == 'Q' else ((1-t)**3*p + 3*(1-t)**2*t*a[0] + 3*(1-t)*t*t*a[1] + t**3*a[2])
            points.append(tuple(q))
        p = a[-1]
    canvas = Image.new('L', (SIZE[0]*2, SIZE[1]*2))
    ImageDraw.Draw(canvas).polygon([(x*SIZE[0]*2/734, y*SIZE[1]*2/1024) for x, y in points], fill=255)
    save_png(map_path(card, 'body'), canvas.resize(SIZE, Image.Resampling.LANCZOS))


def convert(card, record_review):
    directory = ROOT / 'research/tcgl' / card['id']
    source_path = directory / 'source.json'
    source = json.loads(source_path.read_text())
    etch_path = directory / source['rawEtchFile']
    front_path = ROOT / card['front']
    if not front_path.exists():
        front_path = front_path.with_suffix('.webp')
    if digest(etch_path) != source['rawEtchSha256']:
        raise ValueError(f"{card['id']}: source etch hash changed")
    if record_review:
        source['alignmentReview'] = {
            'status': 'reviewed', 'method': 'Raw TCGL etch and paired TCGL front, with colored etch overlay over the unchanged Holo clean front.',
            'capture': f"artifacts/tcgl-etched-migration/{card['id']}-alignment.png",
            'holoFront': str(front_path.relative_to(ROOT)), 'holoFrontSha256': digest(front_path),
            'polarity': 'White strokes interpreted as recessed; invert etch luminance.',
            'verticalFlip': False, 'cropOrOffset': False,
            'observed': 'Upright full-card UV domain. Border, corners, subject contours, title, individual text regions and attack areas align. No visible scaling drift, offset or stretching in the source overlays.',
            'physicalDepth': 'Not measured; same rendering gain as Sylveon 156.',
        }
        dump(source_path, source)
    review = source['alignmentReview']
    if not isinstance(review, dict) or review.get('status') != 'reviewed' or review['holoFrontSha256'] != digest(front_path):
        raise ValueError(f"{card['id']}: source/front alignment review required")

    evidence_path = ROOT / card['evidence']
    evidence = json.loads(evidence_path.read_text()) if evidence_path.exists() else {'cardId': card['id'], 'variant': 'holo', 'maps': {}}
    if 'normalSource' not in evidence:
        evidence['replacedNormal'] = {'file': str(map_path(card, 'normal').relative_to(ROOT)), 'sha256': digest(map_path(card, 'normal'))}
        # Preserve earlier estimated relief evidence as history, not active data.
        evidence['legacyRelief'] = {k: evidence.pop(k) for k in ('authoring', 'regions', 'depthCalibration') if k in evidence}
    preserve_pikachu_body(card)
    unchanged = [front_path, map_path(card, 'foil'), map_path(card, 'protection')]
    if map_path(card, 'secondary-foil').exists():
        unchanged.append(map_path(card, 'secondary-foil'))
    before = {str(p.relative_to(ROOT)): digest(p) for p in unchanged}

    raw = Image.open(etch_path).convert('RGBA')
    src = np.asarray(raw, dtype=np.float32) / 255.0
    height = cv2.resize(1.0 - src[..., :3].mean(axis=2), SIZE, interpolation=cv2.INTER_LINEAR)
    alpha = cv2.resize(src[..., 3], SIZE, interpolation=cv2.INTER_LINEAR)
    protected = grayscale(map_path(card, 'protection'))
    dx = cv2.Scharr(height, cv2.CV_32F, 1, 0, scale=1/32)
    drow = cv2.Scharr(height, cv2.CV_32F, 0, 1, scale=1/32)
    nx = -dx * SLOPE_GAIN
    ny = drow * SLOPE_GAIN
    nx *= 1.0 - protected
    ny *= 1.0 - protected
    nz = np.ones_like(height)
    length = np.sqrt(nx*nx + ny*ny + nz*nz)
    normal = np.stack((nx/length, ny/length, nz/length), axis=2)
    normal = normal * alpha[..., None] + np.array([0.0, 0.0, 1.0]) * (1.0 - alpha[..., None])
    encoded = np.rint(np.clip(normal*.5 + .5, 0, 1)*255).astype(np.uint8)
    save_png(map_path(card, 'normal'), Image.fromarray(encoded, 'RGB'))
    encoded_height = np.rint((.5 + (height - .5)*.25)*255).astype(np.uint8)
    save_png(map_path(card, 'height'), Image.fromarray(encoded_height, 'L'))
    body = grayscale(map_path(card, 'body'), optional=True)
    secondary = grayscale(map_path(card, 'secondary-foil'), optional=True)
    roughness = (.30 + .105*body)*(1.0-secondary) + .27*secondary
    save_png(map_path(card, 'roughness'), Image.fromarray(np.rint(roughness*255).astype(np.uint8), 'L'))

    evidence.update(status='tcgl-etch-derived', mapSize=list(SIZE), textured=True, rendererReady=False)
    evidence['normalSource'] = {'file': str(etch_path.relative_to(ROOT)), 'url': source['rawEtchUrl'], 'sha256': digest(etch_path),
        'tcglCardId': source['tcglCardId'], 'tcglLongFormId': source['tcglLongFormId'], 'dimensions': list(raw.size),
        'operation': 'Full-domain bilinear resize; invert mean etch RGB luminance; unblurred continuous-field Scharr derivatives with scale 1/32; gain 1.03; apply protection to slopes after differentiation; normalize; flatten outside source alpha; opaque RGB OpenGL +Y encoding (-dH/dx,+dH/drow,+Z).',
        'verticalFlip': False, 'cropOrOffset': False, 'slopeGain': SLOPE_GAIN, 'runtimeGeneration': False}
    evidence['heightSource'] = {'file': str(etch_path.relative_to(ROOT)), 'operation': '0.5 + (inverted resized etch luminance - 0.5) * 0.25', 'embossStrength': 0, 'note': 'Inspection only; no live height response.'}
    evidence['finishReference'] = {'cardId': 'sv08.5-156', 'profile': 'Espeon 155 finish used by final Sylveon 156',
        'normalScale': 1, 'embossStrength': 0, 'roughnessMode': 'absolute',
        'roughness': '0.30 background + 0.105 body; blend to 0.27 in existing secondary foil. Missing region maps mean zero coverage.',
        'metalness': .50, 'laminate': .045, 'foilReflectance': .025, 'etchedInkSheen': .85}
    evidence['preservedAssets'] = before
    evidence['limitations'] = 'Exact TCGL line geometry, with estimated physical depth represented by the fixed Sylveon rendering gain. Existing authored foil/protection boundaries remain estimates. No invented noise, smoothing or copied-card relief.'
    for name in ('normal', 'height', 'roughness', 'body'):
        path = map_path(card, name)
        if path.exists():
            evidence['maps'][path.name] = digest(path)
    if card['id'] in ('swsh4-188', 'sm1-154'):
        legacy_source_path = map_path(card, 'source').with_suffix('.json')
        legacy_source = json.loads(legacy_source_path.read_text())
        if 'tcglRelief' not in legacy_source:
            legacy_source['legacyRelief'] = {k: legacy_source.pop(k) for k in ('method', 'estimates') if k in legacy_source}
        if card['id'] == 'swsh4-188':
            legacy_source['maps'].update(size=list(SIZE), generator='scripts/tcgl/convert_etched_cards.py', normalConvention='OpenGL +Y up',
                notes='Exact TCGL etch normal; fixed Sylveon gain 1.03; height is inspection only, embossStrength 0.')
            legacy_source['maps'].pop('heightRangeCm', None)
            legacy_source['maps'].pop('seed', None)
        else:
            legacy_source['maps'].update(evidence['maps'])
        legacy_source['tcglRelief'] = {'source': str(source_path.relative_to(ROOT)), 'evidence': card['evidence'], 'generator': 'scripts/tcgl/convert_etched_cards.py', 'normalScale': 1, 'embossStrength': 0}
        dump(legacy_source_path, legacy_source)
    if before != {str(p.relative_to(ROOT)): digest(p) for p in unchanged}:
        raise ValueError('A preserved front/foil/protection asset changed')
    dump(evidence_path, evidence)
    print(json.dumps({'id': card['id'], 'normal': str(map_path(card, 'normal').relative_to(ROOT)),
                     'dimensions': list(SIZE), 'protectedPixelsFlat': bool(np.all(encoded[protected == 1] == [128, 128, 255]))}), flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--card', action='append')
    parser.add_argument('--record-source-review', action='store_true')
    args = parser.parse_args()
    for card in json.loads(MANIFEST.read_text())['cards']:
        if not args.card or card['id'] in args.card:
            convert(card, args.record_source_review)


if __name__ == '__main__':
    main()
