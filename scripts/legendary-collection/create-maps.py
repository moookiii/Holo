"""Build LC-only PNG coverage; reused source-set holo cutouts stay at their original paths.

Reverse ink separation is an integration estimate from the LC clean fronts. It is
not a physical reverse scan or a substitute for the later fireworks visual pass.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[2] / 'public' / 'cards' / 'pokemon' / 'legendary-collection'
MAPS = ROOT / 'maps'
MAPS.mkdir(exist_ok=True)
SIZE = (600, 825)

# Raster equivalent of the existing Eevee laminate SVG, preserving its finish.
laminate = Image.new('L', (1200, 1650), 140)
ImageDraw.Draw(laminate).rectangle((110, 172, 1093, 873), fill=119)
laminate.save(MAPS / '74-reverse-laminate.png')

WINDOWS = {
    'Pokemon': (55, 86, 547, 437),
    'Trainer': (55, 190, 551, 461),
    'Energy': (22, 120, 578, 602),
}

def window_mask(bounds):
    mask = Image.new('L', SIZE, 255)
    ImageDraw.Draw(mask).rectangle(bounds, fill=0)
    return mask

cards = __import__('json').loads((ROOT / 'catalog.json').read_text(encoding='utf-8'))['cards']
for category in WINDOWS:
    window_mask(WINDOWS[category]).save(MAPS / f'reverse-{category.lower()}-foil.png')

for card in cards:
    number = int(card['localId'])
    if number == 74:
        # The existing hand-registered Eevee protection is retained by reference.
        continue
    front = Image.open(ROOT / f'{number}.png').convert('RGB')
    gray = front.convert('L')
    local = gray.filter(ImageFilter.GaussianBlur(4))
    dark = ImageChops.subtract(local, gray).point(lambda value: min(255, max(0, int((value - 9) * 3.5))))
    # Also keep genuinely dark ink; this protects filled letter cores whose
    # width exceeds the local blur kernel.
    body = gray.point(lambda value: min(255, max(0, int((88 - value) * 2.6))))
    dark = ImageChops.lighter(dark, body)
    coverage = window_mask(WINDOWS[card['category']])
    dark = ImageChops.multiply(dark, coverage)
    # The artwork window is handled by reverse coverage, never a duplicate
    # rectangular protection panel.
    dark.save(MAPS / f'{number}-reverse-protection.png')
print('LC reverse body maps and card-specific print protection ready')
