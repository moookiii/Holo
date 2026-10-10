"""Prepare ten exact-printing SWSH material proofs, never a whole catalog.

Requires the completed TCGL extraction library and its original manifests.
Untouched Unity PNGs and rectangular export corroboration stay in research/.
No front brightness, procedural geometry, or runtime normal generation.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import sys
import cv2
import numpy as np
import requests
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from convert_30th_sources import normal_pixels

ROOT = Path(__file__).resolve().parents[2]
SIZE = (1800, 2475)
CASES = [
    ('reverse', 'swsh1_10_ph', 'swsh-reverse-energy'),
    ('amazing', 'swsh4_50', 'swsh-amazing'),
    ('radiant', 'swsh10_46', 'swsh-radiant'),
    ('shiny', 'swsh4-5_95', 'swsh-shiny-silver'),
    ('v', 'swsh10_161', 'swsh-textured'),
    ('vmax', 'swsh4_44', 'swsh-textured'),
    ('vstar', 'swsh9_123', 'swsh-textured'),
    ('celebrations', 'swsh7-5_11', 'swsh-celebrations-silver'),
    ('classic', 'swsh7-5r_2', 'swsh-celebrations-classic'),
    ('black-gold', 'swsh11a_30', 'gold-etched'),
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def png(path, values):
    Image.fromarray(np.rint(np.clip(values, 0, 1) * 255).astype(np.uint8)).save(path, optimize=True)


def registered(raw, size):
    # Corroborated against the matching 733x1024 TCGL export, not the visible
    # edge of Unity's extended bleed. Same normalized box at every resolution.
    w, h = raw.size
    return raw.resize(size, Image.Resampling.BILINEAR,
                      box=(145 / 1024 * w, 0, 878 / 1024 * w, h))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--extraction', type=Path, required=True)
    args = parser.parse_args()
    manifest = json.loads((args.extraction / 'dataset/manifest.json').read_text())
    output = ROOT / 'public/cards/pokemon/swsh-proofs'
    output.mkdir(parents=True, exist_ok=True)
    cases = []
    for finish, card_id, profile in CASES:
        row = next(r for r in manifest if r['card_id'] == card_id)
        research = ROOT / 'research/tcgl' / card_id
        research.mkdir(parents=True, exist_ok=True)
        target = output / card_id
        target.mkdir(exist_ok=True)
        sources = {}
        raw = {}
        for kind in ('front', 'foil', 'etch'):
            asset = row['assets'][kind]
            if asset['status'] != 'extracted':
                continue
            original = args.extraction / asset['file']
            assert sha(original) == asset['texture']['png_sha256']
            saved = research / (kind + '-unity.png')
            shutil.copyfile(original, saved)
            raw[kind] = Image.open(saved).convert('RGBA')
            sources[kind] = {**asset, 'preserved': saved.relative_to(ROOT).as_posix(),
                             'sha256': sha(saved), 'dimensions': list(raw[kind].size)}
        # Independent rectangular export establishes the source UV crop.
        suffix = row['variant_suffix'] or 'std'
        url = f"https://cdn.malie.io/file/malie-io/tcgl/cards/png/en/{row['set_id']}/{row['bundle_name']}_{suffix}.png"
        corroboration = research / 'export-front.png'
        if not corroboration.exists():
            response = requests.get(url, timeout=45)
            response.raise_for_status()
            corroboration.write_bytes(response.content)
        export = Image.open(corroboration).convert('RGB')
        front = registered(raw['front'], (733, 1024)).convert('RGB')
        error = float(np.abs(np.asarray(front, dtype=float) - np.asarray(export, dtype=float)).mean())
        if error > 3:
            raise ValueError(f'{card_id}: export crop mismatch, mean error {error}')
        front.save(target / 'front.png', optimize=True)
        plate = np.asarray(registered(raw['foil'], SIZE), dtype=np.float32)[..., :3].mean(axis=2) / 255
        secondary = np.zeros_like(plate)
        if finish == 'radiant':
            # Horizontal split lies in the source's unfoiled rule strip. The
            # actual silhouette, icons and footer all remain the TCGL plate.
            secondary[round(SIZE[1] * .52):] = plate[round(SIZE[1] * .52):]
        foil = plate - secondary
        png(target / 'foil.png', foil)
        png(target / 'secondary.png', secondary)
        registered(raw['foil'], (733, 1024)).save(target / 'foil-source.png')
        # Use source whiteplate exclusions, never a threshold of the front.
        protection = 1 - np.clip(plate * 8, 0, 1)
        png(target / 'protection.png', protection)
        body = 1 - plate
        roughness = (.30 + .105 * body) * (1 - secondary) + .27 * secondary
        png(target / 'roughness.png', roughness)
        if 'etch' in raw:
            etch = registered(raw['etch'], (733, 1024))
            Image.fromarray(normal_pixels(etch, protection)).save(target / 'normal.png', optimize=True)
            etch.save(target / 'etch-registered.png')
        evidence = {
            'finish': finish, 'tcglCardId': card_id, 'tcglVariantId': row['long_form_id'],
            'name': row['name'], 'collectorNumber': row['printed_collector_number'],
            'profile': profile, 'exportEntry': row, 'sources': sources,
            'registration': {'unityUvBox': [145/1024, 0, 878/1024, 1],
                'rectangularDomain': [733, 1024], 'verticalFlip': False, 'offset': [0, 0],
                'polarity': 'inverted-mean-rgb', 'corroboratingExport': url,
                'corroboratingSha256': sha(corroboration), 'meanByteDifference': error,
                'notes': 'Crop removes Unity side bleed; complete rectangular card UV retained. Front/foil/etch share the same normalized crop.'},
            'conversion': {'implementation': 'scripts/tcgl/convert_30th_sources.py:normal_pixels',
                'dimensions': list(SIZE), 'slopeGain': 1.03, 'height': '1 - mean RGB',
                'derivatives': 'Scharr CV_32F scale 1/32 before protection',
                'protection': '1 - clamp(8 * exact TCGL whiteplate, 0, 1)',
                'normal': 'OpenGL +Y; opaque RGB; source alpha blends flat',
                'runtimeGeneration': False, 'embossStrength': 0,
                'roughness': '(0.30 + 0.105 * (1 - whiteplate)) * (1 - secondary) + 0.27 * secondary'},
            'outputs': {p.name: sha(p) for p in target.glob('*.png')},
            'status': 'provisional', 'physicalDepth': 'not measured',
            'limitations': ['TCGL whiteplate is a digital optical control, not a measured physical reflectance.',
                'Whiteplate-based protection conservatively suppresses relief outside foil; Classic body frosting needs additional region review.'],
        }
        (research / 'source-evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
        (target / 'evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
        cases.append({k: evidence[k] for k in ('finish', 'tcglCardId', 'tcglVariantId', 'name', 'collectorNumber', 'profile', 'status')})
        print(card_id, 'registered mean difference', round(error, 4), flush=True)
    (output / 'cases.json').write_text(json.dumps(cases, indent=2) + '\n')


if __name__ == '__main__':
    main()
