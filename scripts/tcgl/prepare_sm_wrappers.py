"""Preserve all 62 actual English SM wrappers; crop at native resolution."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import html
import json
import re
import cv2
import numpy as np
from PIL import Image, ImageDraw
from fetch_prismatic_set import fetch

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'research/tcgl/sm-wrappers'
SPECIAL = {'Shining Legends': 'sm3-5', 'Dragon Majesty': 'sm7-5', 'Hidden Fates': 'sm11-5', 'Detective Pikachu': 'gum'}


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    category = 'https://archives.bulbagarden.net/wiki/Category:English_Sun_%26_Moon_Series_packs'
    index = ROOT / 'research/tcgl/sm-wrapper-index.html'
    if not index.exists():
        index.write_bytes(fetch(category))
    files = sorted(set(html.unescape(n) for n in re.findall(r'title="File:([^\"]+)"', index.read_text(encoding='utf-8'))))
    assert len(files) == 62
    def prepare(filename):
        label = filename.rsplit('.', 1)[0]
        prefix, design = label.split(' Booster', 1)
        sid = SPECIAL.get(prefix, prefix.lower())
        design = design.strip() or 'Detective Pikachu'
        name = filename.replace(' ', '_')
        md5 = hashlib.md5(name.encode()).hexdigest()
        url = 'https://archives.bulbagarden.net/media/upload/' + md5[0] + '/' + md5[:2] + '/' + __import__('urllib.parse', fromlist=['quote']).quote(name)
        path = RAW / name
        if not path.exists():
            path.write_bytes(fetch(url))
        image = Image.open(path).convert('RGBA')
        pixels = np.array(image)
        # Only edge-connected presentation whites become transparent. Printed
        # internal whites stay intact. No redraw, stretch, or source upscaling.
        white = (pixels[..., :3].min(2) >= 238).astype('uint8')
        n, labels, stats, _ = cv2.connectedComponentsWithStats(white, 8)
        edge_ids = set(np.r_[labels[0], labels[-1], labels[:, 0], labels[:, -1]]) - {0}
        exterior = np.isin(labels, list(edge_ids))
        pixels[exterior, 3] = 0
        foreground = pixels[..., 3] > 0
        ys, xs = np.where(foreground)
        bounds = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        cropped = Image.fromarray(pixels).crop(bounds)
        art = re.sub(r'[^a-z0-9]+', '-', design.lower()).strip('-')
        target = ROOT / f'public/packs/pokemon/{sid}-{art}.png'
        target.parent.mkdir(parents=True, exist_ok=True)
        cropped.save(target)
        return {'setId': sid, 'id': art, 'name': design + ' booster',
            'url': url, 'sourcePage': 'https://archives.bulbagarden.net/wiki/File:' + name,
            'source': path.relative_to(ROOT).as_posix(), 'sourceDimensions': list(image.size),
            'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'crop': list(bounds),
            'rotation': 0, 'dimensions': list(cropped.size), 'output': target.relative_to(ROOT).as_posix(),
            'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
            'operations': 'Native crop and edge-connected exterior white removal; no resize or stretch.'}
    with ThreadPoolExecutor(max_workers=6) as pool:
        records = list(pool.map(prepare, files))
    (ROOT / 'public/packs/pokemon/sm-wrapper-sources.json').write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')
    registry = {}
    for r in records:
        registry.setdefault(r['setId'], []).append({k: r[k] for k in ['id', 'name']} | {'front': '/packs/pokemon/' + Path(r['output']).name})
    (ROOT / 'src/pokemon/data/sm-wrappers.generated.ts').write_text(
        '// Native English retail wrapper crops. Sources: public/packs/pokemon/sm-wrapper-sources.json\n'
        'import type { PokemonBooster } from "../types.ts";\n'
        'export const smWrappers: Record<string, PokemonBooster[]> = ' + json.dumps(registry) + ';\n', encoding='utf-8')
    sheet = Image.new('RGB', (8 * 180, 8 * 290), '#202020')
    draw = ImageDraw.Draw(sheet)
    for i, r in enumerate(records):
        im = Image.open(ROOT / r['output'])
        im.thumbnail((170, 255))
        x, y = i % 8 * 180, i // 8 * 290
        sheet.paste(im, (x + (180 - im.width) // 2, y + 20), im)
        draw.text((x + 3, y + 3), r['setId'] + ' ' + r['id'][:17], fill='white')
    sheet.save(RAW / 'review.png')
    print('Prepared', len(records), 'actual English wrapper designs.', flush=True)


if __name__ == '__main__':
    main()
