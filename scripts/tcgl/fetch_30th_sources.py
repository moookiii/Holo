"""Preserve authentic English 30th Celebration TCGL sources without activation.

Classic's processed export is empty. Preserve its raw database entries instead;
TCGdex's Classic local IDs are not TCGL collector numbers and are not aliases.
Run with: python scripts/tcgl/fetch_30th_sources.py
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import quote, urlparse
import hashlib
import io
import json
from PIL import Image
from fetch_prismatic_set import fetch

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'research/tcgl/30th-celebration'
EVIDENCE = ROOT / 'docs/30th-tcgl-sources.json'
BASE = 'https://cdn.malie.io/file/malie-io/tcgl/'
GROUPS = {'me5-5': 158, 'me5-5c': 30, 'me5-5m': 3, 'mee': 8}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def preserve_json(url, path):
    content = fetch(url)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return json.loads(content), {'url': url, 'file': path.relative_to(ROOT).as_posix(), 'sha256': sha(content)}


def classic_entries(index):
    """Use exact raw rows, retaining their numbering and variant identity."""
    key = 'card-database-me5-5c_1_en_0.0'
    url = BASE + 'databases/' + quote(index[key]['data'])
    payload, provenance = preserve_json(url, DEST / 'classic-database.json')
    entries = []
    for row in payload['rows']:
        parts = row['longFormID'].split('_')
        if parts[1] != 'me5-5c' or parts[3:] != ['std', 'ClassicCollection', 'ClassicFoil', 'Etched']:
            raise ValueError('Unexpected Classic variant: ' + row['longFormID'])
        number = int(row['EN Card #'])
        if row['cardID'] != f'me5-5c_{number}':
            raise ValueError('Classic ID/number mismatch')
        stem = BASE + f'cards/png/en/me5-5c/me5-5c_en_{number:03d}_std'
        entries.append({'name': row['EN Card Name'], 'source_card_number': number,
            'printed_collector_number': {'numerator': row['CompSea Card Number'], 'denominator': None,
                'full': None, 'review': 'pending: raw database lacks the printed denominator'},
            'rarity': {'designation': 'CLASSIC_COLLECTION'}, 'foil': {'type': 'CLASSIC_FOIL', 'mask': 'ETCHED'},
            'ext': {'tcgl': {'cardID': row['cardID'], 'longFormID': row['longFormID']}},
            'images': {'tcgl': {'png': {'front': stem + '.png', 'foil': stem + '.foil.png', 'etch': stem + '.etch.png'}}},
            'rawDatabaseRow': row})
    return entries, provenance


def preserve_asset(task):
    url, path = task
    try:
        data = path.read_bytes() if path.exists() else fetch(url)
        # Decode before saving: never preserve HTML errors as image assets.
        with Image.open(io.BytesIO(data)) as im:
            im.load()
            if im.format != 'PNG':
                raise ValueError('Expected PNG')
            dimensions, mode = list(im.size), im.mode
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            path.write_bytes(data)
        return url, {'url': url, 'file': path.relative_to(ROOT).as_posix(),
            'dimensions': dimensions, 'mode': mode, 'sha256': sha(data), 'status': 'preserved-original'}
    except Exception as error:
        return url, {'url': url, 'status': 'unavailable', 'error': str(error)}


def main():
    index, index_source = preserve_json(BASE + 'export/index.json', DEST / 'export-index.json')
    database, database_source = preserve_json(BASE + 'databases/index.json', DEST / 'database-index.json')
    tcgdex, dex_source = preserve_json('https://api.tcgdex.net/v2/en/sets/30th', DEST / 'tcgdex-main.json')
    classic_dex, classic_dex_source = preserve_json('https://api.tcgdex.net/v2/en/sets/30th-c', DEST / 'tcgdex-classic.json')
    dex_cards = {int(card['localId']): card for card in tcgdex['cards']}
    printings, downloads, export_sources = [], {}, {}
    for key, expected in GROUPS.items():
        url = BASE + 'export/' + index['en-US'][key]['path']
        entries, export_source = preserve_json(url, DEST / f'{key}.export.json')
        export_sources[key] = export_source
        if key == 'me5-5c' and not entries:
            entries, raw_source = classic_entries(database)
            export_sources[key]['rawDatabaseFallback'] = raw_source
        if key == 'mee':
            entries = [e for e in entries if 9 <= e['collector_number']['numeric'] <= 16]
        if len(entries) != expected:
            raise ValueError(f'Incomplete source group {key}: {len(entries)} != {expected}')
        for entry in entries:
            tcgl = entry['ext']['tcgl']
            number = entry['source_card_number'] if 'source_card_number' in entry else entry['collector_number']['numeric']
            if tcgl['longFormID'].split('_')[3] != 'std' or not entry.get('foil'):
                raise ValueError('Unexpected nonfoil or alternate printing: ' + tcgl['longFormID'])
            printing = {'sourceSet': key, 'name': entry['name'],
                'collectorNumber': entry.get('collector_number', entry.get('printed_collector_number')),
                'rarity': entry.get('rarity', {}).get('designation', tcgl['longFormID'].split('_')[4]), 'tcglCardId': tcgl['cardID'],
                'tcglVariantId': tcgl['longFormID'], 'foil': entry['foil'], 'exportEntry': entry,
                'registrationReview': 'pending', 'physicalFinishReview': 'pending', 'activeInHolo': False}
            if key == 'me5-5':
                dex = dex_cards[number]
                if dex['name'] != entry['name']:
                    raise ValueError('Main TCGdex/TCGL name mismatch')
                printing['tcgdexId'] = dex['id']
            elif key == 'mee':
                printing['canonicalCandidateId'] = f'mee-{number:03d}'
                printing['tcgdexStatus'] = 'not-present-in-current-mee-catalog'
            elif key == 'me5-5c':
                printing['tcglDatabaseNumber'] = number
                # Name-only links are research candidates; never auto-register.
                normalize = lambda name: name.replace('-', ' ').casefold()
                printing['tcgdexCandidates'] = [c['id'] for c in classic_dex['cards'] if normalize(c['name']) == normalize(entry['name'])]
                printing['identityReview'] = 'pending: TCGdex local IDs differ from TCGL numbers; LEGEND halves ambiguous'
            else:
                printing['identityReview'] = 'pending: verify printed R/RGB, G/RGB, B/RGB against numeric TCGL IDs'
            directory = ROOT / 'research/tcgl' / tcgl['cardID'].replace('_', '-')
            for kind, asset_url in entry['images']['tcgl']['png'].items():
                downloads[asset_url] = directory / Path(urlparse(asset_url).path).name
            printings.append(printing)
    if len(printings) != 199 or len({p['tcglVariantId'] for p in printings}) != 199:
        raise ValueError('Expected 199 unique exact variants')
    saved = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        for i, future in enumerate(as_completed([pool.submit(preserve_asset, task) for task in downloads.items()]), 1):
            url, record = future.result()
            saved[url] = record
            if i % 25 == 0:
                print(f'Preserved/checked {i}/{len(downloads)} source assets', flush=True)
    for printing in printings:
        printing['sources'] = {kind: saved[url] for kind, url in printing['exportEntry']['images']['tcgl']['png'].items()}
        directory = ROOT / 'research/tcgl' / printing['tcglCardId'].replace('_', '-')
        save_json(directory / 'source.json', printing)
    unavailable = [record for record in saved.values() if record['status'] == 'unavailable']
    evidence = {'status': 'sources-preserved-review-pending', 'indexSource': index_source,
        'databaseIndexSource': database_source, 'tcgdexSources': [dex_source, classic_dex_source],
        'exportSources': export_sources, 'counts': {'printings': len(printings), 'assets': len(saved),
            'preserved': len(saved) - len(unavailable), 'unavailable': len(unavailable),
            'etchedPrintings': sum('etch' in p['sources'] for p in printings)},
        'missingAssets': unavailable, 'printings': printings,
        'limitations': ['Sources are untouched; no runtime materials or replacement geometry generated.',
            'Exact source geometry is not measured physical depth.',
            'Per-card registration, etch polarity, protection boundaries and physical finish reviews remain required.',
            'Classic candidate links and RGB color identities must be reviewed before assigning Holo identities.']}
    save_json(EVIDENCE, evidence)
    save_json(DEST / 'sources.json', evidence)
    print(json.dumps(evidence['counts']), flush=True)
    if unavailable:
        raise SystemExit('Missing assets recorded; source acquisition is incomplete.')


if __name__ == '__main__':
    main()
