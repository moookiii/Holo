"""Preserve the unnumbered 2020/2022 pack Energy fronts, offline."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import hashlib, json
import requests
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
NAMES = ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal']

def fetch(item):
    year, printing, name = item
    filename = f'{name}Energy{printing}.jpg'
    key = hashlib.md5(filename.encode()).hexdigest()
    url = f'https://archives.bulbagarden.net/media/upload/{key[0]}/{key[:2]}/{filename}'
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    raw = response.content
    image = Image.open(BytesIO(raw)).convert('RGB')
    research = ROOT / f'research/tcgl/swsh-pack-energy/{year}'
    dest = ROOT / f'public/cards/pokemon/swsh-energy/{year}'
    research.mkdir(parents=True, exist_ok=True)
    dest.mkdir(parents=True, exist_ok=True)
    (research / filename).write_bytes(raw)
    target = dest / f'{name.lower()}.png'
    image.save(target)
    return dict(year=year, name=name, source=url, sourcePage=f'https://bulbapedia.bulbagarden.net/wiki/File:{filename}',
                dimensions=list(image.size), sourceSha256=hashlib.sha256(raw).hexdigest(),
                front='/' + target.relative_to(ROOT / 'public').as_posix(),
                outputSha256=hashlib.sha256(target.read_bytes()).hexdigest(), transformations='JPEG decoded to RGB PNG; no crop, flip, offset or resize')

if __name__ == '__main__':
    items = [(year, printing, name) for year, printing in [(2020, 'SwordShield'), (2022, 'BrilliantStars')] for name in NAMES]
    records = list(ThreadPoolExecutor(max_workers=8).map(fetch, items))
    evidence = ROOT / 'public/cards/pokemon/swsh-energy/sources.json'
    evidence.write_text(json.dumps(records, indent=2) + '\n')
    sheet = Image.new('RGB', (8 * 180, 2 * 275), '#202020')
    draw = ImageDraw.Draw(sheet)
    for i, record in enumerate(records):
        image = Image.open(ROOT / ('public' + record['front']))
        image.thumbnail((180, 250))
        x, y = (i % 8) * 180, (i // 8) * 275
        sheet.paste(image, (x, y))
        draw.text((x, y + 252), f"{record['year']} {record['name']}", fill='white')
    sheet.save(ROOT / 'research/tcgl/swsh-pack-energy/review.png')
    print(f'Preserved {len(records)} exact pack Energy fronts')
