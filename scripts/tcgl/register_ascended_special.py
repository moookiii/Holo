"""Register recovered ph2 whiteplates for the standard ME reverse material."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'public/cards/pokemon/tcgl-ascended-original'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    manifest = json.loads((BASE / 'manifest.json').read_text())
    output = BASE / 'registered'
    output.mkdir(exist_ok=True)
    rows = []
    for printing in manifest['printings']:
        if printing['variantSuffix'] != '2':
            continue
        source = ROOT / printing['resources']['whiteplate']['png']
        assert sha(source) == printing['resources']['whiteplate']['pngSha256']
        raw = Image.open(source).convert('RGBA')
        rgba = np.asarray(raw, dtype=np.float32) / 255
        luminance = rgba[..., :3].mean(2)
        floor = 33 / 255
        fields = {
            'foil': np.clip((luminance - floor) / (1 - floor), 0, 1) * rgba[..., 3],
            'protection': np.clip((floor + 8 / 255 - luminance) / (8 / 255), 0, 1) * rgba[..., 3],
        }
        maps = {}
        for name, field in fields.items():
            # Native square packs the 733px card at x=145 in a 1024px domain.
            # Preserve fractional crop bounds; no flip or artwork-only crop.
            registered = Image.fromarray(field).resize(
                (600, 825), Image.Resampling.BILINEAR,
                box=(145 / 1024 * raw.width, 0, 878 / 1024 * raw.width, raw.height))
            path = output / f'{printing["cardId"]}-{name}.png'
            Image.fromarray(np.rint(np.clip(np.asarray(registered), 0, 1) * 255).astype(np.uint8)).save(path)
            maps[name] = {'file': path.relative_to(ROOT).as_posix(), 'sha256': sha(path)}
        rows.append({'cardId': printing['cardId'], 'tcglVariantId': printing['tcglLongFormId'],
                     'source': source.relative_to(ROOT).as_posix(), 'sourceSha256': sha(source), 'maps': maps})
    evidence = {'method': 'Native mean RGB; standard reverse black floor 33/255 removed for foil; standard opaque protection ramp 8/255. Bilinear full-card registration from square TCGL UV x=[145,878]/1024, y=[0,1]; no flip. Untouched source PNGs retained.',
                'dimensions': [600, 825], 'profile': 'ascended-special-reverse inherits mega-standard-reverse',
                'printings': rows}
    (ROOT / 'docs/ascended-special-maps.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(f'Registered {len(rows)} exact special reverse whiteplates')


if __name__ == '__main__':
    main()
