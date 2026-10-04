"""Preserve every exact English Prismatic TCGL printing and its raw assets."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse
import hashlib, json, time
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'research/tcgl/prismatic-set'
BASE = 'https://cdn.malie.io/file/malie-io/tcgl/export/'


def fetch(url):
    for attempt in range(4):
        try:
            response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=60)
            response.raise_for_status()
            return response.content
        except requests.RequestException:
            if attempt == 3:
                raise
            time.sleep(attempt + 1)


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    index = json.loads(fetch(BASE + 'index.json'))
    url = BASE + index['en-US']['sv8-5']['path']
    payload = fetch(url)
    entries = json.loads(payload)
    (DEST / 'export.json').write_bytes(payload)
    (DEST / 'export-source.json').write_text(json.dumps({'url': url, 'sha256': hashlib.sha256(payload).hexdigest()}, indent=2) + '\n')
    # The generated source catalog can retain provider response envelopes.
    records = json.loads('[' + ','.join(line.strip().rstrip(',') for line in (ROOT / 'src/pokemon/data/prismatic.generated.ts').read_text().splitlines() if line.strip().startswith('{')) + ']')
    by_number = {int(r['localId']): r for r in records}
    assets = {}
    printings = []
    identities = set()
    for entry in entries:
        number = entry['collector_number']['numeric']
        card = by_number[number]
        if entry['name'] != card['name']:
            raise ValueError(f"Name mismatch: {number}: {entry['name']} / {card['name']}")
        suffix = entry['ext']['tcgl']['longFormID'].split('_')[3]
        variant = {'ph': 'reverse', 'sph': 'pokeball-reverse', 'mph': 'masterball-reverse'}.get(suffix)
        if suffix == 'std':
            variant = 'holo' if 'foil' in entry else 'normal'
        if variant is None or (number, variant) in identities:
            raise ValueError(f'Invalid/duplicate printing: {number} {suffix}')
        identities.add((number, variant))
        images = entry['images']['tcgl']['png']
        for asset_url in images.values():
            assets[asset_url] = DEST / 'raw' / Path(urlparse(asset_url).path).name
        printings.append({'cardId': card['id'], 'number': f'{number:03d}', 'name': card['name'], 'rarity': card['rarity'],
                          'variant': variant, 'suffix': suffix, 'tcglCardId': entry['ext']['tcgl']['cardID'],
                          'tcglVariantId': entry['ext']['tcgl']['longFormID'], 'foil': entry.get('foil'), 'images': images})
    if len(identities) != 447 or len(by_number) != 180:
        raise ValueError('Incomplete Prismatic set')
    (DEST / 'raw').mkdir(exist_ok=True)
    local = {p.name: p for p in (ROOT / 'research/tcgl').glob('sv08.5-*/*.png')}
    local.update({p.name: p for p in (DEST / 'samples').glob('*.png')})

    def preserve(task):
        asset_url, path = task
        if not path.exists():
            content = local[path.name].read_bytes() if path.name in local else fetch(asset_url)
            temporary = path.with_suffix('.download')
            temporary.write_bytes(content)
            temporary.replace(path)
        with Image.open(path) as image:
            dimensions, mode = list(image.size), image.mode
        return asset_url, {'file': path.relative_to(ROOT).as_posix(), 'dimensions': dimensions, 'mode': mode,
                           'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

    preserved = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        jobs = [pool.submit(preserve, item) for item in assets.items()]
        for i, job in enumerate(as_completed(jobs), 1):
            asset_url, data = job.result()
            preserved[asset_url] = data
            if i % 25 == 0:
                print(f'Preserved {i}/{len(jobs)} exact assets', flush=True)
    for printing in printings:
        printing['sources'] = {kind: {'url': asset_url, **preserved[asset_url]} for kind, asset_url in printing.pop('images').items()}
        printing['alignmentReview'] = 'pending'
    (DEST / 'sources.json').write_text(json.dumps({'exportUrl': url, 'printings': printings}, indent=2) + '\n')
    print(f'Preserved {len(printings)} exact printings / {len(preserved)} raw assets', flush=True)


if __name__ == '__main__':
    main()
