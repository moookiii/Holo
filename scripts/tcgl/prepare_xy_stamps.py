"""Register the three exact XY Worlds logo whiteplates without redrawing glyphs."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PAIRS = {27: '2014', 91: '2015', 176: '2016'}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    for number, year in PAIRS.items():
        source = ROOT / f'public/cards/pokemon/tcgl-xy/xybsp_{number}'
        evidence = json.loads((source / 'evidence.json').read_text(encoding='utf-8'))
        raw = source / 'original-foil.png'
        assert digest(raw) == evidence['sources']['foil']['sha256']
        target = ROOT / f'public/cards/pokemon/xy-worlds-stamps/xybsp-{number}'
        target.mkdir(parents=True, exist_ok=True)
        with Image.open(raw) as image:
            w, h = image.size
            plate = image.resize((733, 1024), Image.Resampling.BILINEAR,
                                 box=(145 / 1024 * w, 0, 878 / 1024 * w, h))
            plate.save(target / 'foil-controls.png')
            plate.convert('L').save(target / 'foil.png')
        Image.new('L', (1, 1), round(.30 * 255)).save(target / 'roughness.png')
        record = {'cardId': f'xybsp-{number}', 'variant': 'holo',
                  'tcglCardId': evidence['tcglCardId'], 'tcglVariantId': evidence['tcglVariantId'],
                  'originalEvidence': f'/cards/pokemon/tcgl-xy/xybsp_{number}/evidence.json',
                  'originalFoilSha256': digest(raw),
                  'originalFrontSha256': evidence['sources']['front']['sha256'],
                  'worldsYear': year, 'dimensions': [733, 1024],
                  'unityUvBox': [145 / 1024, 0, 878 / 1024, 1], 'verticalFlip': False,
                  'method': 'Full-card bilinear registration of exact TCGL Worlds logo whiteplate. Individual glyphs and counters preserved without threshold, morphology, or synthesis.',
                  'profile': 'bw-stamped', 'normalGeneration': False,
                  'outputs': {p.name: digest(p) for p in target.glob('*.png')},
                  'limitations': 'Existing smooth spectral BW Worlds stamp response on exact XY logo coverage; physical angular calibration remains approximate.'}
        (target / 'evidence.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
