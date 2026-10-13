"""Register the three Victory Cup whiteplates for the existing rainbow Crosshatch material."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PAIRS = {29: '3rd place / bronze', 30: '2nd place / silver', 31: '1st place / gold'}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    for number, year in PAIRS.items():
        source = ROOT / f'public/cards/pokemon/tcgl-bw/bwbsp_{number}'
        evidence = json.loads((source / 'evidence.json').read_text(encoding='utf-8'))
        raw = source / 'original-foil.png'
        assert digest(raw) == evidence['sources']['foil']['sha256']
        target = ROOT / f'public/cards/pokemon/bw-victory/bwbsp-{number}'
        target.mkdir(parents=True, exist_ok=True)
        with Image.open(raw) as image:
            w, h = image.size
            plate = image.resize((733, 1024), Image.Resampling.BILINEAR,
                                 box=(145 / 1024 * w, 0, 878 / 1024 * w, h))
            plate.save(target / 'foil-controls.png')
            plate.convert('L').save(target / 'foil.png')
        record = {'cardId': f'bwbsp-{number}', 'variant': 'holo',
                  'tcglCardId': evidence['tcglCardId'], 'tcglVariantId': evidence['tcglVariantId'],
                  'originalEvidence': f'/cards/pokemon/tcgl-bw/bwbsp_{number}/evidence.json',
                  'originalFoilSha256': digest(raw),
                  'originalFrontSha256': evidence['sources']['front']['sha256'],
                  'rank': year, 'dimensions': [733, 1024],
                  'unityUvBox': [145 / 1024, 0, 878 / 1024, 1], 'verticalFlip': False,
                  'method': 'Full-card bilinear registration of own exact TCGL whiteplate without threshold, morphology, or synthesis. Existing rainbow Crosshatch family assigned from user physical reference.',
                  'profile': 'pokemon-crosshatch', 'normalGeneration': False,
                  'outputs': {p.name: digest(p) for p in target.glob('*.png')},
                  'limitations': 'Rainbow Crosshatch identified by user and BW29 photo. Original material is tagged Tinsel/Unknown in the extraction; no long-form variant ID was supplied. Physical angular calibration remains approximate.'}
        (target / 'evidence.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
