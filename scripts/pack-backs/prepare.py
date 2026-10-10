"""Reproduce reviewed pack-back PNGs without upscaling or changing their print."""
from pathlib import Path
import hashlib
import json
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CONFIG = Path(__file__).with_name('sources.json')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    evidence = []
    raw = ROOT / 'research/pack-backs'
    raw.mkdir(parents=True, exist_ok=True)
    for source in json.loads(CONFIG.read_text()):
        sid = source['setId']
        original = raw / (sid + '.jpg')
        if not original.exists():
            response = requests.get(source['url'], timeout=45)
            response.raise_for_status()
            original.write_bytes(response.content)
        im = Image.open(original).convert('RGB')
        result = im.crop(source['crop'])
        rotation = source.get('rotation', 0)
        if rotation:
            result = result.transpose({90: Image.Transpose.ROTATE_90,
                180: Image.Transpose.ROTATE_180, 270: Image.Transpose.ROTATE_270}[rotation])
        out = ROOT / f'public/packs/pokemon/{sid}-back.png'
        result.save(out, optimize=True)
        evidence.append({**source, 'source': original.relative_to(ROOT).as_posix(),
            'sourceDimensions': list(im.size), 'sourceSha256': sha(original),
            'output': out.relative_to(ROOT).as_posix(), 'dimensions': list(result.size),
            'sha256': sha(out), 'rotation': rotation, 'resampled': False})
    (ROOT / 'public/packs/pokemon/back-sources.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(f'{len(evidence)} set-specific pack backs prepared')

if __name__ == '__main__':
    main()
