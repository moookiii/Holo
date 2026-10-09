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
        # Extend only these product keys; preserve unrelated authored thumbnails.
        thumb=image.crop(entry['crop']); thumb.thumbnail((240,360),Image.Resampling.LANCZOS)
        key='/'+entry['output'].removeprefix('public/')+'|'
        filename=hashlib.sha256(key.encode()).hexdigest()[:16]+'.webp'
        thumb.save(ROOT/'public/packs/thumbnails'/filename,'WEBP',quality=83,method=6)
        index_path=ROOT/'src/vending/thumbnails.json'
        index=json.loads(index_path.read_text()); index[key]='packs/thumbnails/'+filename
        index_path.write_text(json.dumps(index,indent=2)+'\n')
        print(entry['output'])

if __name__ == '__main__': main()
