"""Make source/front alignment review sheets; never use these as relief assets."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
CARDS = json.loads(Path(__file__).with_name('etched_cards.json').read_text())['cards']
OUT = ROOT / 'artifacts/tcgl-etched-migration'
OUT.mkdir(parents=True, exist_ok=True)


def local_front(card):
    path = ROOT / card['front']
    if not path.exists():
        path = path.with_suffix('.webp')
    return Image.open(path).convert('RGB')


for page, start in enumerate(range(0, len(CARDS), 3), 1):
    sheet = Image.new('RGB', (1200, 3 * 590), '#222222')
    draw = ImageDraw.Draw(sheet)
    for row, card in enumerate(CARDS[start:start + 3]):
        directory = ROOT / 'research/tcgl' / card['id']
        source = json.loads((directory / 'source.json').read_text())
        front = Image.open(directory / source['matchingTcglFrontFile']).convert('RGB')
        etch = Image.open(directory / source['rawEtchFile']).convert('RGB')
        local = local_front(card).resize(front.size, Image.Resampling.BILINEAR)
        line = np.asarray(etch, dtype=np.float32).mean(axis=2) / 255
        overlay = np.asarray(local, dtype=np.float32)
        overlay = overlay * (1 - line[..., None] * .55) + np.array([0, 255, 140]) * line[..., None] * .55
        overlay = Image.fromarray(np.uint8(np.clip(overlay, 0, 255)))
        overlay.save(OUT / (card['id'] + '-alignment.png'))
        for col, (label, image) in enumerate([('paired TCGL front', front), ('raw TCGL etch', etch), ('etch over Holo front', overlay)]):
            draw.text((col * 400 + 8, row * 590 + 8), card['id'] + ' | ' + label, fill='white')
            image.thumbnail((390, 550), Image.Resampling.LANCZOS)
            sheet.paste(image, (col * 400 + 5, row * 590 + 32))
    sheet.save(OUT / f'sources-{page}.jpg', quality=95)
    print(str(OUT / f'sources-{page}.jpg'))
