"""Preserve all 54 actual English XY wrappers; crop at native resolution."""
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
RAW = ROOT / 'research/tcgl/xy-wrappers'
SPECIAL = {'Double Crisis': 'xy5-5', 'Generations': 'xy9-5'}


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    category = 'https://archives.bulbagarden.net/wiki/Category:English_XY_Series_packs'
    index = ROOT / 'research/tcgl/xy-wrapper-index.html'
    if not index.exists():
        index.write_bytes(fetch(category))
    files = sorted(set(html.unescape(n) for n in re.findall(r'title="File:([^\"]+)"', index.read_text(encoding='utf-8'))))
    assert len(files) == 54
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
        # Preserve white printed artwork even where it touches the perimeter.
        # An exterior flood fill would punch holes through silver/white graphics.
        dark = (pixels[..., :3].min(2) < 245).astype('uint8')
        dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        contours, _ = cv2.findContours(dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        silhouette = np.zeros(dark.shape, dtype='uint8')
        cv2.drawContours(silhouette, [max(contours, key=cv2.contourArea)], -1, 255, cv2.FILLED)
        pixels[..., 3] = silhouette
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
            'operations': 'Native crop and exterior silhouette alpha; interior print untouched, no resize or stretch.'}
    with ThreadPoolExecutor(max_workers=6) as pool:
        records = list(pool.map(prepare, files))
    (ROOT / 'public/packs/pokemon/xy-wrapper-sources.json').write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')
    registry = {}
    for r in records:
        registry.setdefault(r['setId'], []).append({k: r[k] for k in ['id', 'name']} | {'front': '/packs/pokemon/' + Path(r['output']).name})
    (ROOT / 'src/pokemon/data/xy-wrappers.generated.ts').write_text(
        '// Native English retail wrapper crops. Sources: public/packs/pokemon/xy-wrapper-sources.json\n'
        'import type { PokemonBooster } from "../types.ts";\n'
        'export const xyWrappers: Record<string, PokemonBooster[]> = ' + json.dumps(registry) + ';\n', encoding='utf-8')
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

