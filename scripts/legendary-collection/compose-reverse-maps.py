"""Compose LC PNG masks from user masters, preserved text and reviewed circles."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
FRONTS = ROOT / 'public/cards/pokemon/legendary-collection'
MAPS = FRONTS / 'maps'
INPUTS = HERE / 'reverse-protection-inputs'
REVIEW = ROOT / 'artifacts/lc-rework'
SIZE = (600, 825)


def front(number):
    if number == 74:
        return ROOT / 'public/cards/eevee-legendary-reverse/front.png'
    return FRONTS / f'{number}{"-reverse" if number <= 19 else ""}.png'


def circle_layer(circles):
    # Solid white discs with one-pixel antialiasing in source coordinates.
    y, x = np.mgrid[:SIZE[1], :SIZE[0]]
    layer = np.zeros((SIZE[1], SIZE[0]), dtype=np.uint8)
    for cx, cy, radius in circles:
        disc = np.rint(np.clip(radius + .5 - np.hypot(x-cx, y-cy), 0, 1) * 255).astype(np.uint8)
        layer = np.maximum(layer, disc)
    return layer


def registered_master(master, offset, source_rect):
    """Move only the set icon; keep the banner and frame pixels in place."""
    dx, dy = offset
    if dx == 0 and dy == 0:
        return master
    x0, y0, x1, y1 = source_rect
    result = master.copy()
    icon = master[y0:y1, x0:x1].copy()
    result[y0:y1, x0:x1] = 0
    target = result[y0+dy:y1+dy, x0+dx:x1+dx]
    np.maximum(target, icon, out=target)
    return result


def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    corrections = json.loads((HERE / 'reverse-foil-corrections.json').read_text())['cards']
    for row in corrections:
        path = MAPS / f'{row["number"]}-reverse-foil.png'
        coverage = Image.open(path).convert('L')
        ImageDraw.Draw(coverage).rectangle(row['restoreRect'], fill=255)
        coverage.save(path)

    rows = json.loads((HERE / 'reverse-protection-registration.json').read_text())['cards']
    masters = {name: np.array(Image.open(INPUTS / f'{name}-master.png').convert('L'))
               for name in ('basic', 'evolved')}
    icons = json.loads((HERE / 'reverse-set-icon-registration.json').read_text())
    report = []
    for row in rows:
        number = row['number']
        text = np.array(Image.open(INPUTS / f'{number}-text.png').convert('L'))
        protection = text.copy()
        if row['master']:
            master = registered_master(masters[row['master']],
                                       icons['offsets'][str(number)], icons['sourceRect'])
            protection = np.maximum(protection, master)
        protection = np.maximum(protection, circle_layer(row['circles']))
        # Never clip protection against foil: that cut the evolution medallion
        # in half where it overlaps the illustration. These are separate maps.
        target = MAPS / f'{number}-reverse-protection.png'
        temporary = target.with_suffix('.tmp.png')
        Image.fromarray(protection).save(temporary)
        temporary.replace(target)

        rgb = np.array(Image.open(front(number)).convert('RGB')).astype(float)
        foil = np.array(Image.open(MAPS / f'{number}-reverse-foil.png').convert('L'))
        alpha = protection[..., None] / 255 * .45
        overlay = rgb * (1-alpha) + np.array([0, 235, 160]) * alpha
        preview = Image.fromarray(np.uint8(overlay))
        draw = ImageDraw.Draw(preview)
        ys, xs = np.where(foil < 128)
        bounds = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
        draw.rectangle(bounds, outline='#ff40db', width=1)
        preview.save(REVIEW / f'{number}-overlay.png')
        report.append({'number': number, 'master': row['master'], 'circles': len(row['circles']),
                       'preservedTextPixels': int(np.count_nonzero(text)), 'foilBounds': bounds})

    for start in range(0, len(rows), 20):
        sheet = Image.new('RGB', (1500, 1740), '#252525')
        draw = ImageDraw.Draw(sheet)
        for i, row in enumerate(rows[start:start+20]):
            x, y = i % 5 * 300, i // 5 * 435
            draw.text((x+4, y+4), f'{row["number"]}: {row["name"]}', fill='white')
            im = Image.open(REVIEW / f'{row["number"]}-overlay.png').resize((300, 412))
            sheet.paste(im, (x, y+23))
        sheet.save(REVIEW / f'finished-{start+1}.jpg')
    (REVIEW / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f'Composed {len(rows)} protection PNGs; corrected {len(corrections)} foil top strips.')
    print(f'Review overlays: {REVIEW}')


if __name__ == '__main__':
    main()
