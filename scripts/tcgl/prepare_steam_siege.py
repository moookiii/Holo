"""Register the five exact split-type whiteplates, without redrawing motifs."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PAIRS = {11: ['Grass', 'Darkness'], 15: ['Grass', 'Fire'],
         42: ['Lightning', 'Grass'], 64: ['Darkness', 'Metal'], 77: ['Fairy', 'Water']}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    for number, pair in PAIRS.items():
        source = ROOT / f'public/cards/pokemon/tcgl-xy/xy11_{number}_ph'
        evidence = json.loads((source / 'evidence.json').read_text(encoding='utf-8'))
        raw = source / 'original-foil.png'
        assert digest(raw) == evidence['sources']['foil']['sha256']
        target = ROOT / f'public/cards/pokemon/steam-siege-reverse/xy11-{number}'
        target.mkdir(parents=True, exist_ok=True)
        with Image.open(raw) as image:
            w, h = image.size
            plate = image.resize((733, 1024), Image.Resampling.BILINEAR,
                                 box=(145 / 1024 * w, 0, 878 / 1024 * w, h))
            plate.save(target / 'foil-controls.png')
            plate.convert('L').save(target / 'foil.png')
        Image.new('L', (1, 1), round(.30 * 255)).save(target / 'roughness.png')
        record = {'cardId': f'xy11-{number}', 'variant': 'reverse',
                  'tcglCardId': evidence['tcglCardId'], 'tcglVariantId': evidence['tcglVariantId'],
                  'originalEvidence': f'/cards/pokemon/tcgl-xy/xy11_{number}_ph/evidence.json',
                  'originalFoilSha256': digest(raw),
                  'originalFrontSha256': evidence['sources']['front']['sha256'],
                  'leftRightTypes': pair, 'dimensions': [733, 1024],
                  'unityUvBox': [145 / 1024, 0, 878 / 1024, 1], 'verticalFlip': False,
                  'method': 'Full-card bilinear registration of exact TCGL split-type whiteplate. Both type motifs and diagonal divider already exist in the source; no synthesis or compositing.',
                  'profile': 'swsh-reverse-energy', 'normalGeneration': False,
                  'outputs': {p.name: digest(p) for p in target.glob('*.png')},
                  'limitations': 'Existing smooth silver reverse response; physical angular calibration remains approximate.'}
        (target / 'evidence.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
