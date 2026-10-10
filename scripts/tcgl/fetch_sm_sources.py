"""Acquire untouched Sun & Moon TCGL sources with the proven SWSH extractor.

python scripts/tcgl/fetch_sm_sources.py
python scripts/tcgl/fetch_sm_sources.py --validate-only
Resume by rerunning. No viewer registration or material authoring is performed.
"""
from pathlib import Path
from collections import Counter, defaultdict
from PIL import Image
import argparse
import hashlib
import importlib
import json
import os
import shutil
import sys
import re
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote

sys.dont_write_bytecode = True

HOLO = Path(__file__).resolve().parents[2]
ROOT = HOLO / 'research/tcgl/sun-moon-series'
MODULES = Path(__file__).parent / 'unity_source'
sys.path.insert(0, str(MODULES))
pipeline = importlib.import_module('pipeline')
download = importlib.import_module('download')
finalize = importlib.import_module('finalize')
NAMES = {
    'sm1': 'Sun & Moon', 'sm2': 'Guardians Rising', 'sm3': 'Burning Shadows',
    'sm3-5': 'Shining Legends', 'sm4': 'Crimson Invasion', 'sm5': 'Ultra Prism',
    'sm6': 'Forbidden Light', 'sm7': 'Celestial Storm', 'sm7-5': 'Dragon Majesty',
    'sm8': 'Lost Thunder', 'sm9': 'Team Up', 'gum': 'Detective Pikachu',
    'sm10': 'Unbroken Bonds', 'sm11': 'Unified Minds',
    'sm11-5': 'Hidden Fates (including Shiny Vault)', 'sm12': 'Cosmic Eclipse',
    'smbsp': 'Sun & Moon Black Star Promos',
    'smalt': 'Sun & Moon alternate and special printings',
}
KINDS = ['front', 'foil', 'etch', 'cold_foil', 'cast_and_cure']


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, value):
    pipeline.dump(path, value)


def configure():
    for module in [pipeline, download, finalize]:
        module.ROOT = ROOT
    # Resolve only this acquisition's original bundles, never unrelated caches.
    pipeline.USER = ROOT / 'unused-local-sources'
    pipeline.INSTALL = pipeline.CACHE = pipeline.USER
    finalize.NAMES = NAMES


def discover():
    records, sources = [], []
    for path in sorted(pipeline.CONFIG.glob('card-database-*_en_*.json')):
        table = pipeline.database(path)
        rows = [r for r in table['rows'] if
                str(r.get('seriesCode', '')).upper() == 'SM' or
                str(r.get('setCode', '')).lower().startswith('sm')]
        if not rows:
            continue
        target = ROOT / 'dataset/databases' / path.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
        write(target.with_name('decoded-' + path.name), table)
        sources.append({k: v for k, v in table.items() if k != 'rows'})
        for row in rows:
            code = table['name'].split('_')[0].lower()
            number = int(row['EN Card #'])
            cid = row['cardID']
            suffix = row.get('Variant Suffix') or ''
            if row['variant'] not in (0, 1) and 'alt' in code:
                number = int(cid.rsplit('_', 1)[-1])
            mm = 'MaterialManifest'
            if row['variant'] == 1:
                mm += '_ph' + suffix
            records.append({
                'card_id': cid, 'long_form_id': row['longFormID'], 'set_id': code,
                'printed_set_code': row['setCode'], 'collector_number': row['EN Card #'],
                'printed_collector_number': row['CompSea Card Number'],
                'name': row['EN Card Name'], 'variant': row['variant'],
                'variant_suffix': suffix, 'foil_effect': row['Foil Effect'],
                'foil_mask': row['Foil Mask'], 'bundle_name': f'{code}_en_{number:03d}',
                'material_manifest': mm, 'database': target.relative_to(ROOT).as_posix(),
                'row': row,
            })
    for field in ['card_id', 'long_form_id']:
        values = [r[field] for r in records]
        if len(values) != len(set(values)):
            raise ValueError('Duplicate exact inventory identity: ' + field)
    if not set(NAMES).issubset({r['set_id'] for r in records}):
        raise ValueError('One or more required Sun & Moon source tables are absent')
    vault = {r['printed_collector_number'] for r in records
             if r['set_id'] == 'sm11-5' and r['printed_collector_number'].startswith('SV')}
    if vault != {f'SV{i}' for i in range(1, 95)}:
        raise ValueError('Hidden Fates Shiny Vault is incomplete')
    write(ROOT / 'dataset/inventory.json', records)
    write(ROOT / 'evidence/database-sources.json', sources)
    print('Discovered', len(records), 'exact printings across', len(sources), 'tables', flush=True)
    return records


def enumerate_selected(records):
    def selected():
        write(ROOT / 'dataset/card-records.json', records)
        return records
    pipeline.enumerate_cards = download.enumerate_cards = selected


def bootstrap():
    """Reuse preserved official settings/manifests, with their original provenance."""
    upstream = Path.home() / 'TCGL-SWSH-extraction'
    settings = upstream / 'evidence/game-settings.json'
    if not settings.exists():
        raise FileNotFoundError('Working TCGL extractor settings missing: ' + str(settings))
    dest = ROOT / 'evidence/game-settings.json'
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        shutil.copyfile(settings, dest)
    manifests = ROOT / 'evidence/manifests'
    manifests.mkdir(exist_ok=True)
    for path in (upstream / 'evidence/manifests').glob('*'):
        target = manifests / path.name
        if not target.exists():
            os.link(path, target)
    bundle_manifest = pipeline.CONFIG / 'asset-bundle-manifest_0.0.json'
    shutil.copyfile(bundle_manifest, ROOT / 'evidence/asset-bundle-manifest_0.0.json')
    write(ROOT / 'evidence/extractor-provenance.json', {
        'method': 'Existing Sword & Shield Unity downloader/parser/decoder/resolver/finalizer',
        'upstreamWorkspace': str(upstream),
        'modules': {p.name: sha(p) for p in MODULES.glob('*.py')},
        'gameSettings': {'source': str(settings), 'sha256': sha(dest)},
        'assetBundleManifest': {'source': str(bundle_manifest), 'sha256': sha(bundle_manifest)},
        'changes': 'Adapter selects SM inventory and destination; source decoding and exact variant resolver unchanged.',
    })


def acquire(records, workers):
    enumerate_selected(records)
    download.main(workers)
    pipeline.run(min(workers, 2))
    finalize.main()


def audit_source_inventory(workers=8):
    """Cross-check every archived English TCGL table and official full-card bundle.

    Orphan bundles have no known exact long-form ID. Preserve their actual
    manifests and referenced textures separately rather than inventing printings.
    """
    from fetch_prismatic_set import fetch
    records = json.loads((ROOT / 'dataset/inventory.json').read_text(encoding='utf-8'))
    known = {r['card_id']: r for r in records}
    base = 'https://cdn.malie.io/file/malie-io/tcgl/'
    index_path = ROOT / 'evidence/database-index.json'
    if not index_path.exists():
        index_path.write_bytes(fetch(base + 'databases/index.json'))
    index = json.loads(index_path.read_bytes())
    keys = [k for k in index if re.fullmatch(r'card-database-(sm[a-z0-9-]*|gum)_\d+_en_0\.0', k)]
    directory = ROOT / 'evidence/archived-databases'
    directory.mkdir(exist_ok=True)

    def preserve(key):
        url = base + 'databases/' + quote(index[key]['data'])
        path = directory / (key + '.json')
        if not path.exists():
            path.write_bytes(fetch(url))
        data = json.loads(path.read_bytes())
        return key, {'url': url, 'sha256': sha(path), 'file': path.relative_to(ROOT).as_posix(),
                     'rows': data['rows'], 'name': data['name']}

    tables = dict(ThreadPoolExecutor(max_workers=workers).map(preserve, keys))
    missing, conflicts = [], []
    for key, table in tables.items():
        for row in table['rows']:
            cid = row['cardID']
            if cid not in known:
                missing.append({'database': key, 'row': row})
            elif row['longFormID'] != known[cid]['long_form_id']:
                conflicts.append({'database': key, 'card_id': cid,
                                 'archived_long_form_id': row['longFormID'],
                                 'installed_long_form_id': known[cid]['long_form_id']})
    audit = {'archivedEnglishTables': len(tables),
             'sources': {k: {f: v for f, v in t.items() if f != 'rows'} for k, t in tables.items()},
             'missingFromInstalledInventory': missing, 'historicalIdentityChanges': conflicts}
    write(ROOT / 'evidence/archived-inventory-audit.json', audit)
    # Rebuild the same ordered official manifest index as the existing downloader.
    settings = json.loads((ROOT / 'evidence/game-settings.json').read_bytes())
    official_base = settings['data']['windowsplayer_contentpath']
    config = json.loads((ROOT / 'evidence/asset-bundle-manifest_0.0.json').read_bytes())
    dates = json.loads(config['keys']['manifest']['contentString'])['directories']
    official = {}
    for date in dates:
        path = ROOT / 'evidence/manifests' / ('manifest_en_' + date)
        tree = json.loads(path.with_suffix('.json').read_bytes())
        url = official_base + date + '/manifest_en_' + date
        manifest_hash = sha(path)
        for asset in tree['assetList']:
            folder = asset.get('s3Folder', '').replace('0.0/', '')
            official[asset['assetName'].lower()] = {
                'url': official_base + date + '/' + folder + asset['assetName'],
                'manifest_url': url, 'manifest_sha256': manifest_hash, **asset}
    required = {r['bundle_name'] for r in records}
    extra = {n: a for n, a in official.items()
             if re.fullmatch(r'(sm[a-z0-9-]*|gum)_en_\d+', n) and n not in required}
    results = []
    for name, source in extra.items():
        path = ROOT / 'supplementary/incoming' / (name + '.bundle')
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            content = download.fetch(source['url'])
            if not content.startswith(b'UnityFS\0'):
                raise ValueError('Additional bundle signature mismatch: ' + name)
            temporary = path.with_suffix('.download')
            temporary.write_bytes(content)
            temporary.replace(path)
        decoded = pipeline.extract_bundle(path)
        assets = []
        for material in decoded['manifests']:
            for kind, field in zip(KINDS, ['_c', '_w', '_e', '_cf', '_cc']):
                ref = material['tree'].get(field, '')
                matches = [t for t in decoded['textures']
                           if t['name'].lower() in [ref.lower(), Path(ref).stem.lower()]] if ref else []
                asset = {'kind': kind, 'field': field, 'manifest': material['name'], 'reference': ref,
                         'status': 'not_applicable' if not ref else 'extracted' if len(matches) == 1 else 'unresolved'}
                if len(matches) == 1:
                    t = matches[0]
                    with Image.open(ROOT / t['png']) as image:
                        image.load()
                        if image.format != 'PNG' or image.size != (t['width'], t['height']):
                            raise ValueError('Supplementary PNG validation failed: ' + name)
                    if sha(ROOT / t['png']) != t['png_sha256']:
                        raise ValueError('Supplementary PNG hash mismatch: ' + name)
                    asset['texture'] = t
                assets.append(asset)
        results.append({'bundleName': name, 'source': source, 'sha256': sha(path),
                        'rawBundle': decoded['raw_bundle'], 'assets': assets,
                        'textureDecodeStatus': decoded['status'],
                        'tcglVariantId': None,
                        'identityStatus': 'unresolved: no entry in installed or archived English TCGL card tables',
                        'reason': 'Official bundle exists but exact printing identifier is absent; no variant identity fabricated.'})
    write(ROOT / 'supplementary/orphan-bundles.json', results)
    print('Archived inventory audit:', len(tables), 'tables;', len(missing),
          'additional table entries;', len(results), 'orphan official bundles preserved.', flush=True)
    if missing:
        raise RuntimeError('Archived inventory includes additional printings; see exact rows in inventory audit')
    return audit, results


def validate(pilot=False):
    records = json.loads((ROOT / 'dataset/card-records.json').read_text(encoding='utf-8'))
    manifest = json.loads((ROOT / 'dataset/manifest.json').read_text(encoding='utf-8'))
    downloads = json.loads((ROOT / 'dataset/download-results.json').read_text(encoding='utf-8'))
    plan = json.loads((ROOT / 'dataset/download-plan.json').read_text(encoding='utf-8'))
    expected_ids = {r['card_id']: r for r in records}
    if len(manifest) != len(expected_ids) or {r['card_id'] for r in manifest} != set(expected_ids):
        raise ValueError('Manifest/inventory coverage mismatch')
    if not pilot:
        inventory = json.loads((ROOT / 'dataset/inventory.json').read_text(encoding='utf-8'))
        if records != inventory:
            raise ValueError('Full-series inventory differs from extraction input')
    checked, errors, missing = {}, [], []
    for name, record in downloads.items():
        if record['status'] != 'downloaded':
            continue
        for path in [ROOT / record['file'], ROOT / 'dataset/raw-bundles' / record['sha256']]:
            if not path.exists() or sha(path) != record['sha256']:
                errors.append({'bundle': name, 'reason': 'Original bundle hash mismatch', 'file': str(path)})
        if record['source'] != plan['bundles'].get(name):
            errors.append({'bundle': name, 'reason': 'Download source differs from exact official plan'})
    report, printings = {}, []
    for row in manifest:
        original = expected_ids[row['card_id']]
        for field in ['long_form_id', 'set_id', 'bundle_name', 'variant', 'variant_suffix']:
            if row[field] != original[field]:
                errors.append({'card_id': row['card_id'], 'reason': 'Identity mismatch: ' + field})
        group = 'expansion' if row['set_id'] in list(NAMES)[:16] else 'promotional' if row['set_id'] == 'smbsp' else 'supplementary'
        counts = report.setdefault(row['set_id'], {
            'name': NAMES.get(row['set_id'], row['set_id']), 'collection': group,
            'printings': 0, 'assets': {k: {'expected': 0, 'validated': 0, 'notApplicable': 0, 'unresolved': 0} for k in KINDS}})
        counts['printings'] += 1
        sources = {}
        dims = {}
        for kind, asset in row['assets'].items():
            counter = counts['assets'][kind]
            status = asset['status']
            if status == 'not_applicable':
                counter['notApplicable'] += 1
                if asset.get('reason') != 'Exact material manifest has empty texture reference':
                    errors.append({'card_id': row['card_id'], 'kind': kind, 'reason': 'Unproven texture absence'})
            else:
                counter['expected'] += 1
            if status not in ('extracted', 'not_applicable'):
                counter['unresolved'] += 1
                missing.append({'tcglCardId': row['card_id'], 'tcglVariantId': row['long_form_id'], 'kind': kind, **asset})
            if status == 'extracted':
                texture = asset['texture']
                key = texture['png']
                if key not in checked:
                    path = ROOT / key
                    with Image.open(path) as image:
                        image.load()
                        if image.format != 'PNG' or list(image.size) != [texture['width'], texture['height']] or image.mode != texture['mode']:
                            raise ValueError('PNG dimensions/channels mismatch: ' + str(path))
                        pixel_hash = hashlib.sha256(image.tobytes()).hexdigest()
                    if sha(path) != texture['png_sha256'] or pixel_hash != texture['decoded_pixel_sha256']:
                        raise ValueError('PNG checksum mismatch: ' + str(path))
                    if sha(ROOT / texture['serialized']) != texture['serialized_sha256']:
                        raise ValueError('Original serialized texture checksum mismatch: ' + key)
                    checked[key] = True
                if sha(ROOT / asset['file']) != texture['png_sha256']:
                    raise ValueError('Per-printing hard link checksum mismatch')
                bundle = downloads.get(row['bundle_name'])
                if not bundle or bundle['sha256'] != asset['bundle_sha256']:
                    errors.append({'card_id': row['card_id'], 'kind': kind, 'reason': 'Printing mapped to a different bundle'})
                if asset['manifest'] != row['material_manifest'] or asset['field'] != dict(zip(KINDS, ['_c', '_w', '_e', '_cf', '_cc']))[kind]:
                    errors.append({'card_id': row['card_id'], 'kind': kind, 'reason': 'Material reference identity mismatch'})
                dims[kind] = [texture['width'], texture['height']]
                counter['validated'] += 1
            sources[kind] = {
                **asset,
                'url': asset.get('bundle_source', {}).get('url'),
                'file': (ROOT / asset['file']).relative_to(HLO_ROOT).as_posix() if asset.get('file') else None,
                'dimensions': dims.get(kind),
                'sha256': asset.get('texture', {}).get('png_sha256') if asset.get('texture') else None,
                'validationStatus': 'validated' if status == 'extracted' else status,
            }
        # All native map dimensions must be recorded; they can differ by source mip.
        printing = {
            'setId': row['set_id'], 'collection': group, 'name': row['name'],
            'collectorNumber': row['printed_collector_number'],
            'sourceCardNumber': row['collector_number'],
            'tcglCardId': row['card_id'], 'tcglVariantId': row['long_form_id'],
            'variant': row['variant'], 'variantSuffix': row['variant_suffix'],
            'rarity': row['long_form_id'].split('_')[-3],
            'foil': {'type': row['foil_effect'], 'mask': row['foil_mask']},
            'materialManifest': row['material_manifest'],
            'materialManifestRequested': row['material_manifest_requested'],
            'materialManifestSelection': row['material_manifest_selection'],
            'database': original['database'], 'databaseRow': original['row'],
            'sources': sources, 'activeInHolo': False,
            'transforms': 'None; native decoded dimensions, RGBA channels and UnityPy orientation preserved.',
        }
        directory = HOLO / 'research/tcgl' / row['card_id']
        directory.mkdir(parents=True, exist_ok=True)
        write(directory / 'source.json', printing)
        printings.append(printing)
    totals = {kind: {field: sum(s['assets'][kind][field] for s in report.values())
                     for field in ['expected', 'validated', 'notApplicable', 'unresolved']} for kind in KINDS}
    result = {'status': 'validated' if not errors and not missing else 'incomplete',
              'printings': len(manifest), 'sets': report, 'totals': totals,
              'uniqueValidatedPngs': len(checked), 'mappingErrors': errors,
              'missingAssets': missing,
              'missingBundles': plan['missing_from_remote_manifests'],
              'scope': 'Installed English TCGL database snapshot and exact official bundle manifests; unavailable historical physical printings are not inferred.'}
    write(ROOT / 'dataset' / ('pilot-validation.json' if pilot else 'validation.json'), result)
    if not pilot:
        write(ROOT / 'sources.json', {'schema': 'holo-tcgl-original-sources-v1',
                                     'validation': result, 'printings': printings,
                                     'supplementaryOrphanBundles': 'supplementary/orphan-bundles.json',
                                     'inventoryAudit': 'evidence/archived-inventory-audit.json'})
        for sid in report:
            write(ROOT / 'dataset/cards' / sid / 'sources.json', {
                'setId': sid, 'name': report[sid]['name'], 'collection': report[sid]['collection'],
                'printings': [p for p in printings if p['setId'] == sid]})
        write(HOLO / 'docs/sm-tcgl-sources.json', {
            **result, 'sourceManifest': 'research/tcgl/sun-moon-series/sources.json',
            'printingIndex': [{'tcglCardId': p['tcglCardId'], 'tcglVariantId': p['tcglVariantId'],
                              'setId': p['setId'], 'collectorNumber': p['collectorNumber'],
                              'source': 'research/tcgl/' + p['tcglCardId'] + '/source.json'} for p in printings]})
        lines = ['# Sun & Moon original TCGL source collection', '',
                 '| Collection | Printings | Front | Foil | Etch |', '|---|---:|---:|---:|---:|']
        for sid in list(NAMES) + sorted(set(report) - set(NAMES)):
            if sid not in report:
                continue
            s = report[sid]
            cells = [f"{s['assets'][k]['validated']}/{s['assets'][k]['expected']}" for k in ['front', 'foil', 'etch']]
            lines.append(f"| {s['name']} (`{sid}`) | {s['printings']} | " + ' | '.join(cells) + ' |')
        lines += ['', f"Validation: **{result['status']}**. {len(missing)} unresolved asset associations; {len(errors)} mapping/integrity errors.", '',
                  'Counts are exact printing associations, not distinct PNG files. Shared textures remain associated through exact TCGL material references; finishes are never collapsed.', '',
                  'Run `python scripts/tcgl/fetch_sm_sources.py` to resume acquisition and validation; use `--validate-only` for an independent full audit. The first run discovers the entire inventory, acquires and validates Sun & Moon as its pilot, then processes the full series with the same pipeline.', '',
                  'The source collection is `research/tcgl/sun-moon-series/sources.json`; per-set manifests are in `dataset/cards/<set>/sources.json`. Exact card evidence is `research/tcgl/<TCGL-cardID>/source.json`. Paths in Holo source manifests are workspace relative. The original extractor manifest at `dataset/manifest.json` retains its extraction-root-relative format, directly accepted by existing Holo preparation tools.', '',
                  'Original bundles, material manifests, binary/decoded databases, serialized compressed textures, hashes and native decoded PNGs are retained in the source collection. PNGs are lossless exports of native top-level textures; original GPU compression and all mip levels remain in the bundles. Per-printing assets are hard links to the decoded originals, avoiding redundant image storage. Raw data remains in the established ignored research directory.', '',
                  'Etch/foil absence is established only by an empty exact material-manifest reference. Failures remain explicit in validation and source manifests. Duplicate byte/pixel associations and compendium differences are recorded in `dataset/duplicate-assets.json` and `dataset/completeness-audit.json`.', '',
                  'Hidden Fates preserves all SV1–SV94 entries with their original TCGL numeric identities. Black Star Promos and alternate/special printings are separate from expansions. Coverage is relative to the installed English TCGL snapshot; source inventory omissions are recorded rather than replaced with external images.', '',
                  'No rescaling, cropping, recoloring, normal generation, derived masks, shaders, materials, UI, pack mechanics or viewer registrations are included. Individual alignment, polarity and physical finish review belong to the later integration pass. Existing implemented sets and working assets were not modified.']
        (HOLO / 'docs/sm-tcgl-sources.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k not in ['sets', 'missingAssets', 'mappingErrors']}, indent=2), flush=True)
    if errors or missing or result['missingBundles']:
        raise RuntimeError('Incomplete acquisition: exact failures recorded in validation manifest')
    return result


# Workspace root alias used when serializing source paths.
HLO_ROOT = HOLO


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workers', type=int, default=8)
    parser.add_argument('--validate-only', action='store_true')
    args = parser.parse_args()
    if not 1 <= args.workers <= 16:
        parser.error('workers must be between 1 and 16')
    configure()
    if args.validate_only:
        validate()
        return
    bootstrap()
    records = discover()
    pilot_path = ROOT / 'dataset/pilot-validation.json'
    if not pilot_path.exists() or json.loads(pilot_path.read_text())['status'] != 'validated':
        pilot = [r for r in records if r['set_id'] == 'sm1']
        acquire(pilot, args.workers)
        validate(pilot=True)
        print('Sun & Moon pilot validated; proceeding with full discovered series.', flush=True)
    acquire(records, args.workers)
    audit_source_inventory(args.workers)
    validate()


if __name__ == '__main__':
    main()
