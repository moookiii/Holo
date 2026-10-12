"""Register an individual RC whiteplate without altering source color or motifs."""
from pathlib import Path
import argparse, hashlib, json
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def prepare(number):
    source = ROOT / f'public/cards/pokemon/tcgl-xy/xy9-5r_{number}'
    evidence = json.loads((source/'evidence.json').read_bytes())
    target = ROOT / f'public/cards/pokemon/generations-rc/{number}'
    target.mkdir(parents=True, exist_ok=True)
    for kind, entry in evidence['sources'].items():
        assert sha(source/f'original-{kind}.png') == entry['sha256']
    assert 'etch' not in evidence['sources'], 'Etched source requires separate exact-geometry review'
    outputs = {}
    if 'foil' in evidence['sources']:
        with Image.open(source/'original-foil.png') as raw:
            w,h = raw.size
            plate = raw.resize((733,1024), Image.Resampling.BILINEAR,
                               box=(145/1024*w,0,878/1024*w,h)).convert('L')
            plate.save(target/'foil.png')
        outputs['foil'] = {'path': f'/cards/pokemon/generations-rc/{number}/foil.png',
                           'sha256': sha(target/'foil.png'), 'dimensions': [733,1024]}
    profile = 'print-only' if not outputs else 'generations-rc-full-art' if number >= 28 else 'generations-rc-ex' if number in (6,21) else 'generations-rc-holo'
    evidence = {'tcglCardId': evidence['tcglCardId'], 'tcglVariantId': evidence['tcglVariantId'],
                'printing': evidence['printing'], 'profile': profile,
                'treatmentStatus': 'existing-material', 'deferredEffect': None,
                'sources': evidence['sources'], 'registration': evidence['registration'],
                'outputs': outputs, 'normalGeneration': False,
                'method': 'Same full-card Unity UV box as the clean front; bilinear registered continuous whiteplate, grayscale PNG. No threshold, invented motifs, front-derived coverage or relief.',
                'physicalReview': 'Supplied photographs establish the eight reference cards. Remaining cards reuse the reviewed family with their own exact whiteplates; individual dynamic physical calibration remains approximate. See docs/generations-rc.md.'}
    (target/'evidence.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8')
    print(number, evidence['tcglVariantId'], 'foil' if outputs else 'nonfoil')

if __name__ == '__main__':
    p=argparse.ArgumentParser(); p.add_argument('number',type=int); prepare(p.parse_args().number)
