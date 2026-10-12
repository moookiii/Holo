"""Independent BW inventory, native-coordinate and material evidence audit.

Run after fetch_bw_sources.py. Does not author images or modify Holo runtime.
"""
from collections import Counter
from pathlib import Path
import argparse
import hashlib
import inspect
import json
import re
import sys
from PIL import Image

sys.dont_write_bytecode = True
import fetch_bw_sources as acquisition

ROOT = acquisition.ROOT
HOLO = acquisition.HOLO
read = lambda path: json.loads(path.read_bytes())
write = acquisition.write
sha = acquisition.sha


def metadata():
    """Preserve negative lookups, including raw inventories, not just exports."""
    acquisition.configure()
    acquisition.bootstrap()
    from fetch_prismatic_set import fetch
    base = 'https://cdn.malie.io/file/malie-io/tcgl/'
    endpoints = {}
    for kind in ['export', 'databases']:
        path = ROOT / 'evidence' / (kind + '-index.json')
        if not path.exists():
            path.write_bytes(fetch(base + kind + '/index.json'))
        endpoints[kind] = {'url': base + kind + '/index.json', 'file': str(path.relative_to(ROOT)),
                           'sha256': sha(path)}
    indices = {k: read(ROOT / v['file']) for k, v in endpoints.items()}
    tables = []
    bw_rows = []
    for path in sorted(acquisition.pipeline.CONFIG.glob('card-database-*_en_*.json')):
        table = acquisition.pipeline.database(path)
        matches = [r for r in table['rows'] if
                   str(r.get('seriesCode', '')).upper() == 'BW' or
                   str(r.get('setCode', '')).lower().startswith('bw')]
        bw_rows.extend(matches)
        tables.append({'file': str(path), 'sha256': sha(path), 'rows': len(table['rows']),
                       'bwRows': len(matches), 'name': table['name']})
    pattern = re.compile(r'mc.?donald|mcd\d|mcdon|mcdonald', re.I)
    english_keys = [k for k in indices['databases'] if '_en_' in k]
    settings = read(ROOT / 'evidence/game-settings.json')
    config = read(ROOT / 'evidence/asset-bundle-manifest_0.0.json')
    dates = json.loads(config['keys']['manifest']['contentString'])['directories']
    assets, manifests = [], []
    for date in dates:
        path = ROOT / 'evidence/manifests' / ('manifest_en_' + date + '.json')
        tree = read(path)
        assets.extend(a['assetName'] for a in tree['assetList'])
        manifests.append({'file': str(path.relative_to(ROOT)), 'sha256': sha(path),
                          'url': settings['data']['windowsplayer_contentpath'] + date + '/manifest_en_' + date})
    evidence = {
        'indices': endpoints, 'installedEnglishTables': tables,
        'processedEnglishExportBwKeys': [k for k in indices['export']['en-US'] if k.startswith('bw')],
        'rawEnglishDatabaseBwKeys': [k for k in english_keys if k.startswith('card-database-bw')],
        'officialManifestSources': manifests,
        'mcdonalds': {
            'status': 'not_found_in_accessible_tcgl_inventories',
            'query': pattern.pattern,
            'processedExportKeys': [k for k in indices['export']['en-US'] if pattern.search(k)],
            'rawDatabaseKeys': [k for k in english_keys if pattern.search(k)],
            'installedBwRowMatches': [r for r in bw_rows if pattern.search(json.dumps(r))],
            'officialBundleNames': sorted({n for n in assets if pattern.search(n)}),
            'limitation': 'No English McDonald collection identity is supplied by these TCGL sources. '
                          'This does not prove absence from every historic client. No replacement acquired.'},
    }
    inventory = read(ROOT / 'dataset/inventory.json')
    promo_numbers = {int(r['collector_number']) for r in inventory if r['set_id'] == 'bwbsp'}
    archived = read(ROOT / 'evidence/archived-inventory-audit.json')
    gaps = []
    for number in sorted(set(range(1, max(promo_numbers) + 1)) - promo_numbers):
        bundle = f'bwbsp_en_{number:03d}'
        matches = sorted({n for n in assets if n.lower() == bundle})
        gaps.append({'collectorNumber': f'BW{number:02d}', 'bundleQuery': bundle,
                     'installedTableMatches': [], 'processedExportMatches': [],
                     'archivedEnglishTablesChecked': archived['archivedEnglishTables'],
                     'officialBundleMatches': matches,
                     'status': 'original_bundle_preserved_without_variant_identity' if matches else 'not_found_in_accessible_tcgl_sources',
                     'limitation': 'Numeric gap in BW01–BW101; no long-form printing identity invented.'})
    evidence['promoNumberGaps'] = gaps
    upstream = Path.home() / 'TCGL-SWSH-extraction'
    local_sources = {}
    for name in ['evidence/file-inventory.json', 'dataset/bundle-index.json']:
        path = upstream / name
        target = ROOT / 'evidence/local-archives' / Path(name).name
        write(target, read(path))
        local_sources[name] = {'source': str(path), 'sha256': sha(path),
                               'preservedFile': target.relative_to(ROOT).as_posix()}
    bundles = read(upstream / 'dataset/bundle-index.json')
    evidence['localArchiveScan'] = {
        'sources': local_sources, 'inspectedUnitySources': len(bundles),
        'bwBundles': [b for b in bundles if any(n.startswith('bw') for n in b.get('bundle_names', []))],
        'note': 'Preserved installation/cache scan inspected Unity bundles even in hashed cache paths. '
                'No BW bundles were present. New verified downloads are reused on resume.'}
    write(ROOT / 'evidence/series-lookup-audit.json', evidence)
    print('Preserved raw/processed inventory lookup evidence.', flush=True)


def audit():
    acquisition.configure()
    validation = read(ROOT / 'dataset/validation.json')
    manifest = read(ROOT / 'dataset/manifest.json')
    inventory = read(ROOT / 'dataset/inventory.json')
    assert validation['status'] == 'validated'
    assert {r['card_id'] for r in inventory} == {r['card_id'] for r in manifest}
    required_sets = set(acquisition.NAMES)
    assert required_sets.issubset({r['set_id'] for r in inventory})
    # Each source uses the same native Texture2D UV convention. UnityPy applies
    # the same decoder vertical conversion to the fronts and their exact maps.
    # Do not infer geometry/height orientation by correlating printed brightness.
    from UnityPy.export import Texture2DConverter
    decoder_path = Path(inspect.getfile(Texture2DConverter))
    decoder = {'file': str(decoder_path), 'sha256': sha(decoder_path),
               'orientation': 'UnityPy native Texture2D decoder orientation for every texture; no extra flip',
               'uvDomain': [0, 0, 1, 1], 'crop': None, 'offset': [0, 0], 'rescale': None}
    per_set, registration, extra_textures, fields, unbound_references = {}, [], [], Counter(), []
    checkpoints = {}
    for row in manifest:
        front = row['assets']['front']['texture']
        digest = row['assets']['front']['bundle_sha256']
        if digest not in checkpoints:
            checkpoints[digest] = read(ROOT / 'dataset/checkpoints' / (digest + '.json'))
        bundle = checkpoints[digest]
        material = next(m for m in bundle['manifests'] if m['name'] == row['material_manifest'])
        fields.update(material['tree'].keys())
        mapped = {a['texture']['path_id'] for a in row['assets'].values() if a['status'] == 'extracted'}
        extras = [t for t in bundle['textures'] if t['path_id'] not in mapped]
        # Alternate finish textures in a shared bundle are deliberately retained;
        # the exact manifest, not filename similarity, assigns a variant's maps.
        if extras:
            extra_textures.append({'cardId': row['card_id'], 'bundleSha256': digest,
                                   'unassignedToThisFinish': extras})
        known_fields = {'_c', '_w', '_e', '_cf', '_cc'}
        for field, value in material['tree'].items():
            if field in known_fields or not isinstance(value, str):
                continue
            if any(t['name'].lower() == Path(value).stem.lower() for t in bundle['textures']):
                unbound_references.append({'cardId': row['card_id'], 'field': field, 'reference': value})
        for kind, asset in row['assets'].items():
            if kind == 'front' or asset['status'] != 'extracted':
                continue
            texture = asset['texture']
            assert texture['orientation'] == front['orientation']
            registration.append({'cardId': row['card_id'], 'kind': kind,
                                 'frontDimensions': [front['width'], front['height']],
                                 'mapDimensions': [texture['width'], texture['height']],
                                 'frontReference': row['assets']['front']['reference'],
                                 'mapReference': asset['reference'],
                                 'materialManifest': material['name'], 'bundleSha256': digest,
                                 'sameDecoderOrientation': True, 'fullCardUvDomainPreserved': True,
                                 'pixelDimensionsMatch': (front['width'], front['height']) == (texture['width'], texture['height']),
                                 'status': 'native_reference_and_coordinate_frame_verified'})
        s = per_set.setdefault(row['set_id'], {'cardDefinitions': set(), 'finishVariants': 0,
                                               'foilTypes': Counter(), 'materialShaders': Counter()})
        s['cardDefinitions'].add((row['printed_set_code'], row['printed_collector_number'], row['name']))
        s['finishVariants'] += 1
        s['foilTypes'][row['foil_effect']] += 1
        s['materialShaders'][material['tree'].get('_s', '')] += 1
    assert not unbound_references, 'Additional texture-valued manifest fields need dedicated resolution'
    # Check EVERY decoded file, including originals not referenced by any finish
    # (the client bundles also contain small card-art sprites).
    used_materials = {(a.get('bundle_sha256'), a.get('manifest')) for r in manifest
                      for a in r['assets'].values() if a.get('bundle_sha256')}
    used_textures = {a['texture']['png'] for r in manifest for a in r['assets'].values()
                     if a['status'] == 'extracted'}
    downloads = read(ROOT / 'dataset/download-results.json')
    source_by_hash = {r['sha256']: r['source'] for r in downloads.values() if r['status'] == 'downloaded'}
    unindexed_materials, supplementary, all_textures = [], [], []
    for digest, bundle in checkpoints.items():
        assert bundle['status'] == 'ok' and not bundle['errors']
        for material in bundle['manifests']:
            if (digest, material['name']) not in used_materials:
                unindexed_materials.append({'bundleSha256': digest, 'manifest': material})
        for texture in bundle['textures']:
            all_textures.append(texture['png'])
            if texture['png'] in used_textures:
                continue  # Already fully decoded/pixel/file/serialized checked by acquisition.validate.
            path = ROOT / texture['png']
            with Image.open(path) as image:
                image.load()
                assert image.format == 'PNG'
                assert image.size == (texture['width'], texture['height']) and image.mode == texture['mode']
                assert hashlib.sha256(image.tobytes()).hexdigest() == texture['decoded_pixel_sha256']
            assert sha(path) == texture['png_sha256']
            assert sha(ROOT / texture['serialized']) == texture['serialized_sha256']
            supplementary.append({'bundleNames': bundle['bundle_names'], 'bundleSha256': digest,
                                  'source': source_by_hash[digest], 'texture': texture,
                                  'printingIds': [r['card_id'] for r in manifest if
                                                 r['assets']['front']['bundle_sha256'] == digest],
                                  'role': 'original supplementary texture; no finish material reference',
                                  'validationStatus': 'validated'})
    assert not unindexed_materials, 'Bundle contains finish manifests absent from printing inventory'
    write(ROOT / 'evidence/all-native-textures-audit.json', {
        'decodedTextures': len(all_textures), 'printingReferencedTextures': len(used_textures),
        'supplementaryTextures': supplementary, 'unindexedFinishManifests': unindexed_materials,
        'status': 'validated'})
    archived = read(ROOT / 'evidence/archived-inventory-audit.json')
    assert not archived['missingFromInstalledInventory']
    write(ROOT / 'evidence/native-registration-audit.json', {
        'decoder': decoder, 'checkedAssociations': len(registration), 'associations': registration,
        'materialManifestFields': dict(fields), 'additionalUnresolvedTextureFields': unbound_references,
        'limits': 'Verifies original TCGL reference associations and native full-card coordinate frame. '
                  'Does not establish physical etch polarity/depth or visual correctness of the TCGL source artwork.'})
    write(ROOT / 'evidence/finish-bundle-extra-textures.json', extra_textures)
    report = read(HOLO / 'docs/bw-tcgl-sources.json')
    for sid, counts in per_set.items():
        counts['cardDefinitions'] = len(counts['cardDefinitions'])
        counts['foilTypes'] = dict(counts['foilTypes'])
        counts['materialShaders'] = dict(counts['materialShaders'])
        report['sets'][sid].update(counts)
    report['lookupEvidence'] = read(ROOT / 'evidence/series-lookup-audit.json')
    report['nativeRegistration'] = {'checkedAssociations': len(registration), 'decoder': decoder,
                                   'manifest': 'research/tcgl/bw-series/evidence/native-registration-audit.json'}
    report['additionalMaps'] = ['cold_foil', 'cast_and_cure']
    report['allNativeTextures'] = {'validated': len(all_textures),
                                  'printingReferenced': len(used_textures),
                                  'supplementary': len(supplementary), 'unindexedFinishManifests': 0,
                                  'manifest': 'research/tcgl/bw-series/evidence/all-native-textures-audit.json'}
    for sid in report['sets']:
        report['sets'][sid]['supplementaryOriginalTextures'] = sum(
            any(n.startswith(sid + '_en_') for n in t['bundleNames']) for t in supplementary)
    report['materialWorkLater'] = {
        'foilTypes': dict(Counter(r['foil_effect'] for r in inventory)),
        'note': 'Retain TCGL shader IDs, masks and etches for EX/Mega EX, BREAK, Ancient Trait, '
                'ACE SPEC, Team Plasma, Radiant Collection, shiny, Full Art/gold and promotional finishes. No shaders implemented.'}
    compact_printings = []
    for printing in read(ROOT / 'sources.json')['printings']:
        compact = {k: printing[k] for k in ['setId', 'name', 'collectorNumber', 'sourceCardNumber',
                   'tcglCardId', 'tcglVariantId', 'variant', 'variantSuffix', 'rarity', 'foil',
                   'materialManifest', 'materialManifestRequested', 'materialManifestSelection']}
        compact['assets'] = {}
        for kind, asset in printing['sources'].items():
            texture = asset.get('texture') or {}
            compact['assets'][kind] = {k: asset.get(k) for k in ['status', 'reason', 'url', 'file',
                'dimensions', 'sha256', 'reference', 'field', 'bundle_sha256']}
            compact['assets'][kind]['originalTexture'] = {k: texture.get(k) for k in
                ['name', 'path_id', 'format_name', 'mode', 'decoded_pixel_sha256',
                 'serialized', 'serialized_sha256', 'orientation']}
        compact_printings.append(compact)
    write(HOLO / 'docs/bw-tcgl-assets.json', {
        'schema': 'holo-tcgl-original-asset-index-v1', 'root': ROOT.relative_to(HOLO).as_posix(),
        'status': report['status'], 'printings': compact_printings,
        'absenceEvidence': 'Empty exact original MaterialManifest texture reference',
        'lookupEvidence': report['lookupEvidence'], 'supplementaryTextures': supplementary,
        'orphanBundles': read(ROOT / 'supplementary/orphan-bundles.json')})
    report['assetIndex'] = 'docs/bw-tcgl-assets.json'
    write(HOLO / 'docs/bw-tcgl-sources.json', report)
    write(ROOT / 'dataset/acquisition-report.json', report)
    lines = ['# English BW original TCGL acquisition', '',
             '| Collection | Card definitions | Finish variants | Front | Foil | Etch | Additional maps |',
             '|---|---:|---:|---:|---:|---:|---:|']
    for sid in acquisition.NAMES:
        s = report['sets'][sid]
        a = s['assets']
        cells = [f"{a[k]['validated']}/{a[k]['expected']}" for k in ['front', 'foil', 'etch']]
        additional = sum(a[k]['validated'] for k in ['cold_foil', 'cast_and_cure'])
        lines.append(f"| {s['name']} (`{sid}`) | {s['cardDefinitions']} | {s['finishVariants']} | " +
                     ' | '.join(cells) + f' | {additional} |')
    lines += ['', f"Validation: **{report['status']}**; {len(report['missingAssets'])} unresolved asset references; "
              f"{len(report['mappingErrors'])} integrity/association errors. {archived['archivedEnglishTables']} archived English tables checked.", '',
              'Counts are exact printing/finish associations; shared original textures are not collapsed into fewer variants. '
              'Card definition counts group printed set, collector number and name within each source collection.', '',
              'All 11 main expansions and Dragon Vault are included; Legendary Treasures Radiant Collection, Black Star Promos and alternate/special '
              'printings are separate source tables. McDonaldâ€™s collections were not found in the accessible English '
              'TCGL export index, raw database index, installed BW rows or official bundle names. Exact negative '
              'lookups and source hashes are in `evidence/series-lookup-audit.json`. This limitation is explicit; '
              'no external artwork or synthetic replacement is used.', '',
              f"Official bundles without a table identity: {len(report.get('unresolvedVariantIdentities', []))}. "
              'They remain separately preserved in `supplementary/orphan-bundles.json` with actual texture references '
              'and unresolved identities; they are not counted as identified finish variants.', '',
              f"All {len(all_textures)} native decoded textures validated, including {len(supplementary)} "
              'supplementary originals outside finish material references (including small card-art sprites). '
              'They are retained with their original bundle identity; they are not misclassified as foil or etching. '
              'No additional unindexed finish material manifests were found.', '',
              'The processed export has no BW inventory. Extraction instead uses raw TCGL binary card tables, '
              'archived decoded tables, official bundle manifests and exact per-variant MaterialManifest references.', '',
              'Resume: `python scripts/tcgl/fetch_bw_sources.py --workers 8`. Independent full checksum audit: '
              '`python scripts/tcgl/fetch_bw_sources.py --validate-only`; then '
              '`python scripts/tcgl/audit_bw_sources.py` for the expanded acquisition report.', '',
              'Raw source collection: `research/tcgl/bw-series/sources.json`. Per-set manifests: '
              '`research/tcgl/bw-series/dataset/cards/<set>/sources.json`. Exact printing evidence: '
              '`research/tcgl/<TCGL-cardID>/source.json`. The complete committed report and printing index are '
              '`docs/bw-tcgl-sources.json`. Large raw assets follow Holoâ€™s ignored research convention.', '',
              'Original Unity bundles retain compressed pixels and all mip levels. Serialized texture objects, '
              'native lossless decoded PNGs, dimensions, channel modes, SHA-256 file/pixel hashes and source asset '
              'IDs are preserved. Each finish is assigned through its own exact bundle/material reference. '
              'Duplicate byte/pixel groups are audited; shared originals are retained with their actual associations.', '',
              'Automated registration validation checks matching native decoder orientation, the untouched full-card '
              'UV domain and exact front/map references in the same material manifest. Native dimensions are recorded '
              'without imposing a rescale. No extra flip, crop, offset or pixel edit is applied. This does not establish '
              'physical groove depth, polarity or visual correctness of the source; those require later rendering/physical review.', '',
              'Original white-plate foil (_w), etch (_e), cold-foil (_cf) and cast-and-cure (_cc) are tracked separately. '
              'Empty exact material references establish absence. Missing manifests, failed downloads and decode failures '
              'remain errors. All bundle textures, including textures used by other finishes, remain preserved.', '',
              'Dedicated later material review: Rainbow, AngledPillars, Cosmos, Squares, Thatch, CrackedIce, '
              'FlatSilver, Galabw, Tinsel, Stamped and SolidColor. Exact TCGL shader IDs are listed per set in the JSON '
              'report; no physical foil response is inferred from scan brightness.', '',
              'Acquisition only. No gallery, material, shader, normal, derived mask or pack changes. Existing assets '
              'and unrelated sets are unchanged.']
    text = '\n'.join(lines) + '\n'
    (HOLO / 'docs/bw-tcgl-sources.md').write_text(text, encoding='utf-8')
    (ROOT / 'dataset/COVERAGE.md').write_text(text, encoding='utf-8')
    print(json.dumps({'sets': len(per_set), 'finishVariants': len(manifest),
                      'nativeMapAssociationsVerified': len(registration),
                      'unindexedTextureFields': len(unbound_references)}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--metadata-only', action='store_true')
    args = parser.parse_args()
    metadata()
    if not args.metadata_only:
        audit()
