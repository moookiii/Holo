"""Reproduce the reviewed English wrapper crops without resampling artwork."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
def main():
    entries = json.loads((ROOT / 'docs/30th-wrapper-sources.json').read_text())
    for entry in entries:
        source = ROOT / 'research/30th-packs' / (entry['product'] + '.png')
        if hashlib.sha256(source.read_bytes()).hexdigest() != entry['sourceSha256']:
            raise ValueError('Wrapper source changed: ' + str(source))
        image = Image.open(source)
        assert list(image.size) == entry['sourceDimensions']
        # Source is already upright. Retain printed top/bottom seals in full.
        image.crop(entry['crop']).save(ROOT / entry['output'], optimize=True)
        output = ROOT / entry['output']
        assert hashlib.sha256(output.read_bytes()).hexdigest() == entry['sha256']
        print(entry['output'])

if __name__ == '__main__': main()
