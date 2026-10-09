"""Offline anniversary normal conversion, gated by card-specific source review.

python scripts/tcgl/convert_30th_sources.py --card me5-5_147 --review review.json
Review must bind original source hashes, a clean Holo front and authored PNG
protection/body/secondary maps. Acquisition never implies review or activation.
"""
from pathlib import Path
import argparse
import hashlib
import json
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/30th-tcgl-sources.json'
SIZE = (1800, 2475)
GAIN = 1.03


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normal_pixels(raw, protection, size=SIZE):
    """Exact Sylveon operations; protection is applied AFTER differentiation."""
    src = np.asarray(raw.convert('RGBA'), dtype=np.float32) / 255.0
    height = cv2.resize(1.0 - src[..., :3].mean(axis=2), size, interpolation=cv2.INTER_LINEAR)
    alpha = cv2.resize(src[..., 3], size, interpolation=cv2.INTER_LINEAR)
    if protection.shape != height.shape:
        raise ValueError('Protection must match output dimensions')
    dx = cv2.Scharr(height, cv2.CV_32F, 1, 0, scale=1 / 32)
    drow = cv2.Scharr(height, cv2.CV_32F, 0, 1, scale=1 / 32)
    nx = -dx * GAIN * (1.0 - protection)
    ny = drow * GAIN * (1.0 - protection)
    nz = np.ones_like(height)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.stack((nx / length, ny / length, nz / length), axis=2)
    normal = normal * alpha[..., None] + np.array([0.0, 0.0, 1.0]) * (1.0 - alpha[..., None])
    return np.rint(np.clip(normal * 0.5 + 0.5, 0, 1) * 255).astype(np.uint8)


def verified_png(record, expected_size=None):
    path = ROOT / record['file']
    if path.suffix.lower() != '.png' or digest(path) != record['sha256']:
        raise ValueError('PNG source/review hash mismatch: ' + str(path))
    with Image.open(path) as im:
        if im.format != 'PNG' or (expected_size and im.size != expected_size):
            raise ValueError('PNG dimensions/format mismatch: ' + str(path))
        return im.copy()


def convert(printing, review):
    if 'etch' not in printing['sources']:
        raise ValueError('No exact TCGL etch; do not invent one')
    if review.get('tcglVariantId') != printing['tcglVariantId'] or review.get('status') != 'reviewed':
        raise ValueError('Exact printing review required')
    registration = review['registration']
    if (registration.get('polarity') != 'inverted-mean-rgb' or registration.get('verticalFlip') is not False
            or registration.get('crop') is not None or registration.get('offset') != [0, 0]
            or registration.get('fullCardUv') is not True):
        raise ValueError('Verified full-domain Sylveon registration/polarity required')
    if not review.get('observations') or not review.get('captures'):
        raise ValueError('Record boundary, glyph, border and source observations/captures')
    for capture in review['captures']:
        if not (ROOT / capture).is_file():
            raise ValueError('Missing review capture: ' + capture)
    sources = printing['sources']
    if review.get('sourceHashes') != {kind: source['sha256'] for kind, source in sources.items()}:
        raise ValueError('Review does not bind exact source hashes')
    for source in sources.values():
        verified_png(source, tuple(source['dimensions']))
    verified_png(review['cleanFront'])
    prefix = printing['tcglCardId'].replace('_', '-')
    maps = {}
    for name in ('protection', 'body', 'secondary'):
        record = review['maps'][name]
        expected = f'public/cards/pokemon/30th-celebration/maps/{prefix}-{name}.png'
        if record['file'] != expected:
            raise ValueError('Use this card\'s own authored map: ' + expected)
        image = verified_png(record, SIZE)
        if image.mode != 'L':
            raise ValueError('Region masks must be grayscale PNGs')
        maps[name] = np.asarray(image, dtype=np.float32) / 255.0
    etch = verified_png(sources['etch'])
    pixels = normal_pixels(etch, maps['protection'])
    roughness = (.30 + .105 * maps['body']) * (1.0 - maps['secondary']) + .27 * maps['secondary']
    output = ROOT / 'public/cards/pokemon/30th-celebration/maps'
    output.mkdir(parents=True, exist_ok=True)
    normal_path = output / (prefix + '-normal.png')
    rough_path = output / (prefix + '-roughness.png')
    replaced = {str(p.relative_to(ROOT)): digest(p) for p in (normal_path, rough_path) if p.exists()}
    Image.fromarray(pixels).save(normal_path, optimize=True)
    Image.fromarray(np.rint(roughness * 255).astype(np.uint8)).save(rough_path, optimize=True)
    evidence = {'tcglCardId': printing['tcglCardId'], 'tcglVariantId': printing['tcglVariantId'],
        'sources': sources, 'review': review, 'replacedAssets': replaced, 'outputDimensions': list(SIZE),
        'conversion': {'luminance': 'mean RGB', 'height': '1 - luminance', 'resize': 'bilinear full UV domain',
            'derivatives': 'OpenCV Scharr CV_32F, scale 1/32, before protection', 'slopeGain': GAIN,
            'normalConvention': 'OpenGL +Y (-dH/dx, +dH/drow, +Z)', 'sourceAlpha': 'blend to flat normal',
            'encoding': 'opaque RGB round(clamp(normal * .5 + .5) * 255)', 'runtimeGeneration': False},
        'outputs': {p.name: digest(p) for p in (normal_path, rough_path)},
        'finishReference': 'src/materials/profiles/tcglEtchedFinish.ts',
        'mapSettings': {'normalScale': 1, 'embossStrength': 0, 'roughnessMode': 'absolute', 'embossMaskFromNormalAlpha': False},
        'roughness': '(0.30 + 0.105 * body) * (1 - secondary) + 0.27 * secondary',
        'activeInHolo': False, 'rendererReview': 'pending',
        'limitations': 'Geometry is authentic TCGL; physical groove depth is not measured. No active height emboss.'}
    (output / (prefix + '-evidence.json')).write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf-8')
    return evidence


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--card', required=True, help='Exact TCGL card ID, including its source set')
    parser.add_argument('--review', required=True, type=Path)
    args = parser.parse_args()
    sources = json.loads(SOURCE.read_text(encoding='utf-8'))
    printing = next(p for p in sources['printings'] if p['tcglCardId'] == args.card)
    result = convert(printing, json.loads(args.review.read_text(encoding='utf-8')))
    print(json.dumps({'card': args.card, 'outputs': result['outputs'], 'activeInHolo': False}))


if __name__ == '__main__':
    main()
