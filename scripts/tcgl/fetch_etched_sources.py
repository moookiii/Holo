"""Preserve exact TCGL sources. Fetching never substitutes another printing.

python scripts/tcgl/fetch_etched_sources.py [--card sv08.5-144]
This step only collects sources; review them before running the offline converter.
"""
from pathlib import Path
from urllib.parse import quote, urljoin, urlparse
import argparse
import hashlib
import json
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
BASE = 'https://cdn.malie.io/file/malie-io/tcgl/'
MANIFEST = Path(__file__).with_name('etched_cards.json')
SESSION = requests.Session()
SESSION.headers['User-Agent'] = 'Mozilla/5.0'


def fetch(url):
    response = SESSION.get(url, timeout=45)
    response.raise_for_status()
    return response.content


def dump(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def preserve(card, entry, entry_url, etch_url, front_url, provider):
    directory = ROOT / 'research/tcgl' / card['id']
    directory.mkdir(parents=True, exist_ok=True)
    paths = []
    for url in (etch_url, front_url):
        path = directory / Path(urlparse(url).path).name
        if not path.exists():
            path.write_bytes(fetch(url))
        with Image.open(path) as image:
            dimensions = list(image.size)
        paths.append((path, dimensions, hashlib.sha256(path.read_bytes()).hexdigest()))
    etch, front = paths
    dump(directory / 'entry.json', entry)
    dump(directory / 'source.json', {
        'provider': provider, 'exportEntry': entry_url,
        'tcglCardId': entry['ext']['tcgl']['cardID'],
        'tcglLongFormId': entry['ext']['tcgl']['longFormID'],
        'name': entry['name'], 'collectorNumber': entry['collector_number']['full'],
        'rarity': entry['rarity']['designation'], 'foil': entry['foil'],
        'rawEtchUrl': etch_url, 'rawEtchFile': etch[0].name,
        'rawEtchDimensions': etch[1], 'rawEtchSha256': etch[2],
        'matchingTcglFrontUrl': front_url, 'matchingTcglFrontFile': front[0].name,
        'matchingTcglFrontDimensions': front[1], 'matchingTcglFrontSha256': front[2],
        'alignmentReview': 'pending',
        **({'assetUrlBasis': 'Exact raw TCGL longFormID standard variant, using the same TCGL CDN PNG naming scheme as the processed exports. Downloaded paired front and etch must be inspected before conversion.'} if 'rawRow' in entry else {}),
    })
    print(json.dumps({'id': card['id'], 'variant': entry['ext']['tcgl']['longFormID'],
                      'dimensions': etch[1], 'source': etch_url}), flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--card', action='append')
    args = parser.parse_args()
    cards = json.loads(MANIFEST.read_text())['cards']
    if args.card:
        cards = [c for c in cards if c['id'] in args.card]
    index = json.loads(fetch(BASE + 'export/index.json'))['en-US']
    exports = {}
    raw_index = None
    for card in cards:
        key = card['setKey']
        if key not in index:
            # Malie's processed schema currently covers SV and newer. Older
            # exact printing identities are present in the raw TCGL database.
            if raw_index is None:
                raw_index = json.loads(fetch(BASE + 'databases/index.json'))
            raw_key = f'card-database-{key}_0_en_0.0'
            entry_url = BASE + 'databases/' + quote(raw_index[raw_key]['data'])
            rows = json.loads(fetch(entry_url))['rows']
            candidates = [r for r in rows if r['EN Card #'] == str(card['number'])
                          and r['EN Card Name'] == card['name']
                          and r['longFormID'] == card['rawLongFormId']
                          and r['Foil Mask'] == 'Etched']
            if len(candidates) != 1:
                raise ValueError(f"Expected one exact raw entry for {card['id']}; found {len(candidates)}")
            row = candidates[0]
            entry = {'name': row['EN Card Name'], 'collector_number': {'full': row['EN Card #'] + '/' + row['EN Expansion Denominator']},
                     'rarity': {'designation': 'RARE_RAINBOW'},
                     'foil': {'type': row['Foil Effect'], 'mask': row['Foil Mask']},
                     'ext': {'tcgl': {'cardID': row['cardID'], 'longFormID': row['longFormID']}}, 'rawRow': row}
            stem = f"{key}_en_{card['number']:03d}_std"
            etch_url = BASE + f'cards/png/en/{key}/{stem}.etch.png'
            front_url = BASE + f'cards/png/en/{key}/{stem}.png'
            preserve(card, entry, entry_url, etch_url, front_url, 'Malie raw TCGL card database and exact TCGL PNG assets')
            continue
        entry_url = urljoin(BASE + 'export/', index[key]['path'])
        if key not in exports:
            exports[key] = json.loads(fetch(entry_url))
        candidates = [e for e in exports[key] if e['collector_number']['numeric'] == card['number']
                      and e['name'] == card['name']
                      and e['rarity']['designation'] == card['rarity']
                      and e.get('foil', {}).get('mask') == 'ETCHED'
                      and e['ext']['tcgl']['longFormID'].split('_')[3] == 'std']
        if len(candidates) != 1:
            raise ValueError(f"Expected one exact etched entry for {card['id']}; found {len(candidates)}")
        entry = candidates[0]
        images = entry['images']['tcgl']['png']
        preserve(card, entry, entry_url, images['etch'], images['front'], 'Malie processed TCGL card export')


if __name__ == '__main__':
    main()
