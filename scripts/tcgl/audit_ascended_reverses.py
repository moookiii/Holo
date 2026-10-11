"""Audit every ASC reverse against current TCGL PNG *and packed texture* sources.

This writes evidence, never card fronts or renderer maps. --refresh bypasses the
local audit cache. --require-ready fails if authentic special motifs are missing.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import argparse
import hashlib
import io
import json
import re

from PIL import Image, ImageDraw

from fetch_sv_sets import BASE, ROOT, fetch

ARCHIVE = ROOT / 'research/tcgl/ascended-reverses'
REPORT = ROOT / 'docs/ascended-reverse-audit.json'
CHECKLIST = 'https://masterthis.app/sets/ascended-heroes'
PATTERNS = {'Poke Ball': 'poke-ball', 'Dusk Ball': 'dusk-ball',
            'Quick Ball': 'quick-ball', 'Friend Ball': 'friend-ball',
            'Love Ball': 'love-ball'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + '\n', encoding='utf-8')


def acquire(url, path, refresh):
    path.parent.mkdir(parents=True, exist_ok=True)
    if refresh or not path.exists():
        payload = fetch(url)
        # Never overwrite the preserved original acquisition.
        path.write_bytes(payload)
    return path.read_bytes()


def checklist_printings(html):
    decoder = json.JSONDecoder()
    for match in re.finditer(r'\[\{', html):
        try:
            data, _ = decoder.raw_decode(html[match.start():])
        except json.JSONDecodeError:
            continue
        if isinstance(data, list) and len(data) == 613 and all('card' in p and 'number' in p for p in data):
            return data
    raise ValueError('Expected the complete 613-printing physical checklist')


def special_assignments(printings):
    result = {}
    for p in printings:
        if p['printing'] != 'Reverse Holo':
            continue
        name = p['card']
        pattern = next((value for label, value in PATTERNS.items() if name.endswith(' (' + label + ')')), None)
        if pattern is None and name.startswith("Team Rocket's") and not name.endswith('(Energy Symbol Pattern)') and p.get('details', {}).get('supertype') == 'Pokémon':
            pattern = 'team-rocket'
        if pattern:
            number = int(p['number'].split('/')[0])
            if number in result:
                raise ValueError('Duplicate special assignment: ' + str(number))
            result[number] = {'pattern': pattern, 'productName': name, 'referenceUrl': p['url'], 'referenceImageUrl': p['imgL']}
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--refresh', action='store_true')
    parser.add_argument('--require-ready', action='store_true')
    args = parser.parse_args()
    index_raw = acquire(BASE + 'index.json', ARCHIVE / 'index.json', args.refresh)
    export_url = BASE + json.loads(index_raw)['en-US']['me2-5']['path']
    export_raw = acquire(export_url, ARCHIVE / 'export.json', args.refresh)
    entries = json.loads(export_raw)
    checklist_raw = acquire(CHECKLIST, ARCHIVE / 'physical-checklist.html', args.refresh)
    assignments = special_assignments(checklist_printings(checklist_raw.decode('utf-8')))
    reverse_entries = [e for e in entries if e['ext']['tcgl']['cardID'].endswith(('_ph', '_ph2'))]
    special_numbers = {e['collector_number']['numeric'] for e in reverse_entries if e['ext']['tcgl']['cardID'].endswith('_ph2')}
    if len(reverse_entries) != 318 or len(special_numbers) != 140 or set(assignments) != special_numbers:
        raise ValueError(f'Incomplete exact-print coverage: {len(reverse_entries)} reverse entries, {len(assignments)} assignments; difference {set(assignments) ^ special_numbers}')
    jobs = [(e, kind, e['images']['tcgl'][kind]['foil']) for e in reverse_entries for kind in ('png', 'tex')]

    def download(job):
        e, kind, url = job
        path = ARCHIVE / 'current-sources' / kind / url.rsplit('/', 1)[1]
        payload = acquire(url, path, args.refresh)
        with Image.open(io.BytesIO(payload)) as im:
            im.load()
            dimensions, mode = list(im.size), im.mode
            pixels = sha(im.convert('RGBA').tobytes())
        return (e['ext']['tcgl']['cardID'], kind), {'url': url, 'file': path.relative_to(ROOT).as_posix(),
            'sha256': sha(payload), 'rgbaSha256': pixels, 'dimensions': dimensions, 'mode': mode}

    sources = {}
    with ThreadPoolExecutor(max_workers=12) as pool:
        for i, (key, value) in enumerate(pool.map(download, jobs), 1):
            sources[key] = value
            if i % 100 == 0:
                print(f'Decoded {i}/{len(jobs)} current TCGL sources', flush=True)
    rows = []
    manifest = json.loads((ROOT / 'public/cards/pokemon/tcgl-me/me02.5/tcgl/manifest.json').read_text())
    surfaces = {(s['cardId'], s['variant']): s for s in manifest}
    for e in reverse_entries:
        tcgl_id = e['ext']['tcgl']['cardID']
        number = e['collector_number']['numeric']
        special = tcgl_id.endswith('_ph2')
        variant = 'special-reverse' if special else 'reverse'
        card_id = f'me02.5-{number:03d}'
        expected = assignments[number] if special else {'pattern': 'energy-' + e['types'][0].lower() if e['card_type'] == 'POKEMON' else 'plain', 'referenceUrl': CHECKLIST}
        pair_id = f'me2-5_{number}_ph'
        duplicate = special and all(sources[(tcgl_id, kind)]['rgbaSha256'] == sources[(pair_id, kind)]['rgbaSha256'] for kind in ('png', 'tex'))
        surface = surfaces[(card_id, variant)]
        evidence = json.loads((ROOT / 'public' / surface['evidence'].lstrip('/')).read_text())
        if surface['tcglVariantId'] != e['ext']['tcgl']['longFormID'] or evidence['tcglCardId'] != tcgl_id:
            raise ValueError('Wrong runtime/source identity: ' + tcgl_id)
        rows.append({'cardId': card_id, 'name': e['name'], 'collectorNumber': e['collector_number']['full'],
            'variant': variant, 'tcglCardId': tcgl_id, 'tcglVariantId': e['ext']['tcgl']['longFormID'],
            'expectedFinish': expected, 'sources': {kind: sources[(tcgl_id, kind)] for kind in ('png', 'tex')},
            'matchesOrdinarySource': bool(duplicate), 'sourceStatus': 'incorrect-duplicate' if duplicate else 'requires-visual-review' if special else 'ordinary-source-preserved',
            'runtimeProfile': surface['profile'], 'runtimeMaps': surface['maps'],
            'runtimeMapHashes': {key: sha((ROOT / 'public' / url.lstrip('/')).read_bytes()) for key, url in surface['maps'].items()},
            'frontSha256': sha((ROOT / f'public/cards/pokemon/tcgl-me/me02.5/{number:03d}.png').read_bytes())})
    references, comparison_rows = [], []
    for number in (1, 8, 11, 17, 18, 108):
        assignment = assignments[number]
        path = ARCHIVE / f'references/{number:03d}.jpg'
        payload = acquire(assignment['referenceImageUrl'], path, args.refresh)
        with Image.open(path) as im:
            im.load()
            references.append({'cardId': f'me02.5-{number:03d}', **assignment,
                'file': path.relative_to(ROOT).as_posix(), 'dimensions': list(im.size), 'sha256': sha(payload)})
            thumbnail = im.convert('RGB')
            thumbnail.thumbnail((350, 500))
        row = Image.new('RGB', (1100, 540), '#222222')
        draw = ImageDraw.Draw(row)
        draw.text((6, 6), f'{number:03d} {assignment["productName"]}', fill='white')
        row.paste(thumbnail, (0, 30))
        for column, suffix in enumerate(('ph', 'ph2')):
            im = Image.open(ARCHIVE / f'current-sources/png/me2-5_en_{number:03d}_{suffix}.foil.png').convert('RGB')
            im.thumbnail((350, 500))
            row.paste(im, (370 + column * 365, 30))
            draw.text((370 + column * 365, 6), suffix + ' original TCGL foil', fill='white')
        comparison_rows.append(row)
    capture = ROOT / 'artifacts/ascended-reverses/source-comparison.jpg'
    capture.parent.mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGB', (1100, 540 * len(comparison_rows)))
    for i, row in enumerate(comparison_rows):
        sheet.paste(row, (0, i * 540))
    sheet.save(capture, quality=95)
    report = {'setId': 'me02.5', 'checkedAtUtc': datetime.now(timezone.utc).isoformat(),
        'export': {'url': export_url, 'sha256': sha(export_raw)},
        'physicalChecklist': {'url': CHECKLIST, 'sha256': sha(checklist_raw), 'method': 'Explicit per-product Ball names and Team Rocket Pokemon reverse listings; no global assignment or evolution inference.'},
        'reversePrintings': len(rows), 'standardReverses': 178, 'specialReverses': 140, 'downloadedFoilSources': len(sources),
        'unavailableSpecialPatterns': sum(r['matchesOrdinarySource'] for r in rows),
        'implementationReady': False, 'visualValidationComplete': False,
        'representativeReferences': references,
        'sourceComparisonCapture': capture.relative_to(ROOT).as_posix(),
        'limitations': 'Product checklists establish assigned finishes, not optical calibration. Duplicate PNG and packed texture sources cannot supply authentic special symbol geometry. Renderer assets are unchanged; special finishes remain unresolved, not completed.',
        'printings': rows}
    write(REPORT, report)
    print(json.dumps({key: value for key, value in report.items() if key not in ('printings', 'physicalChecklist', 'representativeReferences', 'limitations')}, indent=2))
    if args.require_ready and not report['implementationReady']:
        raise SystemExit('Authentic special reverse sources and physical visual validation are required; source audit is not renderer completion.')


if __name__ == '__main__':
    main()
