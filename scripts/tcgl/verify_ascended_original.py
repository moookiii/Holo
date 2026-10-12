"""Verify recovered native ASC symbols, assign families and compare existing Holo assets.

All pattern classification uses the extracted TCGL textures. The previous physical
checklist is a cross-check only; neither its images nor Malie assets generate masks.
Any temporary threshold/crop is inspection-only and is never delivered as an asset.
"""
from collections import Counter
from pathlib import Path
import hashlib
import json
import shutil

import numpy as np
from PIL import Image, ImageDraw

from extract_ascended_original import HOLO, ROOT, ASSETS, INSTALL, CONFIG, sha, write, relative

REFERENCES = {'poke-ball': 1, 'friend-ball': 8, 'love-ball': 11,
              'quick-ball': 25, 'team-rocket': 18, 'dusk-ball': 108}
ENERGY = {'G': 'grass', 'R': 'fire', 'W': 'water', 'L': 'lightning',
          'P': 'psychic', 'F': 'fighting', 'D': 'darkness', 'M': 'metal',
          'N': 'dragon', 'C': 'colorless'}
FILE_HASHES = {}


def file_sha(path):
    stat = path.stat()
    key = (str(path.resolve()), stat.st_size, stat.st_mtime_ns)
    if key not in FILE_HASHES:
        FILE_HASHES[key] = sha(path.read_bytes())
    return FILE_HASHES[key]


def load(path):
    return json.loads(path.read_bytes())


def symbol_signature(texture):
    # Native 512x512 coordinates of the central symbol. Broad gray band admits
    # the lighter and darker native ink levels while excluding white print and
    # protected black glyphs. No source pixels are changed by this comparison.
    a = np.array(Image.open(HOLO / texture['png']))[267:430, 174:338, 0]
    return (a > 40) & (a < 205)


def main():
    manifest = load(ASSETS / 'manifest.json')
    assert manifest['scope'] == 'all-English-reverses'
    printings = manifest['printings']
    assert len(printings) == 318
    assert len({p['tcglCardId'] for p in printings}) == 318
    by_number = {int(p['collectorNumber'].split('/')[0]): p for p in printings if p['variantSuffix']}
    templates = {name: symbol_signature(by_number[number]['resources']['whiteplate'])
                 for name, number in REFERENCES.items()}
    old_audit = load(HOLO / 'docs/ascended-reverse-audit.json')
    old = {p['tcglCardId']: p for p in old_audit['printings']}
    comparisons, classifications = [], []
    runtime_checks = 0
    for printing_index, p in enumerate(printings, 1):
        assert p['materialManifest']['tree']['_w'] == p['resources']['whiteplate']['name']
        assert p['resources']['whiteplate']['dimensions'] == [512, 512]
        assert p['resources']['whiteplate']['mode'] == 'RGBA'
        assert p['materialManifest']['tree']['_s'] == 'TPCi/Cards3D/HoloFoil/FlatSilver'
        assert all(p['resources'][kind] is None for kind in ('etch', 'coldFoil', 'castAndCure'))
        for t in (v for v in p['resources'].values() if v):
            assert file_sha(HOLO / t['png']) == t['pngSha256']
            im = Image.open(HOLO / t['png'])
            assert sha(im.tobytes()) == t['pixelSha256']
            assert sha(im.convert('RGBA').tobytes()) == t['rgbaSha256']
            assert file_sha(HOLO / t['serialized']) == t['serializedSha256']
            assert file_sha(HOLO / t['bundle']['file']) == t['bundle']['sha256']
        if p['variantSuffix']:
            assert p['variantSuffix'] == '2' and p['differsFromOrdinaryReverse']
            signature = symbol_signature(p['resources']['whiteplate'])
            scores = sorted((float(np.mean(signature != target)), name) for name, target in templates.items())
            error, family = scores[0]
            margin = scores[1][0] - error
            assert error < 0.15 and margin > 0.03, (p['tcglCardId'], scores)
            assert family == old[p['tcglCardId']]['expectedFinish']['pattern'], (p['tcglCardId'], family)
            p['specialPattern'] = p['pattern'] = family
            p['patternAssignmentStatus'] = 'native-symbol-verified'
            p['patternVerification'] = {'method': 'Native symbol signature matched to six visually inspected original TCGL references',
                'referenceTcglCardId': by_number[REFERENCES[family]]['tcglCardId'],
                'inspectionRegion': [174, 267, 338, 430], 'bestMismatchFraction': error,
                'nextBestMargin': margin, 'physicalChecklistAgrees': True}
            classifications.append({'tcglCardId': p['tcglCardId'], 'family': family, 'scores': scores})
        else:
            p['pattern'] = 'energy-' + ENERGY[p['energyTypeCode']] if p['energyTypeCode'] else 'plain-reverse'
            p['patternAssignmentStatus'] = 'native-energy-or-plain-reverse-verified'
        p['physicalChecklistReference'] = old[p['tcglCardId']]['expectedFinish'].get('referenceUrl')
        legacy_source = old[p['tcglCardId']]['sources']['tex']
        legacy = Image.open(HOLO / legacy_source['file'])
        native = Image.open(HOLO / p['resources']['whiteplate']['png'])
        comparisons.append({'tcglCardId': p['tcglCardId'], 'nativeReference': p['resources']['whiteplate']['name'],
            'existingExportFile': legacy_source['file'], 'nativeRGBAHash': sha(native.convert('RGBA').tobytes()),
            'existingExportRGBAHash': sha(legacy.convert('RGBA').tobytes()),
            'sameDecodedRGB': native.size == legacy.size and native.convert('RGB').tobytes() == legacy.convert('RGB').tobytes(),
            'sameDecodedRGBA': native.size == legacy.size and native.convert('RGBA').tobytes() == legacy.convert('RGBA').tobytes()})
        number = p['collectorNumber'].split('/')[0]
        front = HOLO / f'public/cards/pokemon/tcgl-me/me02.5/{number}.png'
        assert file_sha(front) == old[p['tcglCardId']]['frontSha256']
        runtime_checks += 1
        for key, url in old[p['tcglCardId']]['runtimeMaps'].items():
            assert file_sha(HOLO / 'public' / url.lstrip('/')) == old[p['tcglCardId']]['runtimeMapHashes'][key]
            runtime_checks += 1
        if printing_index % 50 == 0:
            print('Verified', printing_index, '/', len(printings), flush=True)

    # One original texture is reused byte-for-byte by the two Special Energies.
    # Keep both native reference/pathID/bundle identities, store its PNG once.
    canonical = {}
    duplicates = {entry['texture']: entry for entry in manifest.get('deduplication', [])}
    for p in printings:
        t = p['resources']['whiteplate']
        key = t['rgbaSha256']
        if key in canonical and canonical[key]['png'] != t['png']:
            original_path = HOLO / t['png']
            retained = ROOT / 'duplicate-pngs' / original_path.name
            retained.parent.mkdir(parents=True, exist_ok=True)
            if original_path.exists():
                shutil.move(str(original_path), str(retained))
            t['originalDecodedPng'] = relative(retained)
            t['png'] = canonical[key]['png']
            t['pngSha256'] = canonical[key]['pngSha256']
            t['sharesPNGWithTexture'] = canonical[key]['name']
            duplicates[t['name']] = {'texture': t['name'], 'sharesWith': canonical[key]['name']}
        else:
            canonical[key] = t
    # Normal holo whiteplates were incidental objects in the same raw bundle.
    # Preserve them in research rather than mixing them with the reverse assets.
    for path in (ASSETS / 'whiteplates').glob('me2-5_wp_en_*.png'):
        target = ROOT / 'normal-holo-whiteplates' / path.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(path), str(target))

    shared = load(ASSETS / 'shared/flat-silver-materials.json')
    shared['selectedMaterialName'] = 'MAT_Cards3D_FlatSilver'
    shared['selectedMaterialSource'] = 'MaterialManager.TEMP_CorrectBadMaterialNames(FlatSilver) -> CardMatNameSanitizer.SanitizeMaterials -> shadersbundle.LoadAssetAsync<Material>'
    shared['selectedMaterial'] = next(m for m in shared['materials'] if m['tree']['m_Name'] == shared['selectedMaterialName'])
    shared['activePatternTexture'] = 'Per-card _CardWhitePlateMask set from exact MaterialManifest_ph/_ph2._w'
    shared['activeSharedTextures'] = ['T_Holofoil_Mask_Bar_Wide_Single', 'FX_T_Spectrum_FlatSilver']
    shared['inactiveCCTextures'] = ['FX_T_Spectrum_SVHolo2', 'FX_T_SVUltra_Glitter']
    shared['castAndCureActiveForASCReverses'] = False
    shader_path = ROOT / 'shared/FlatSilver.shader.serialized'
    shared['shader']['serialized'] = relative(shader_path)
    shared['shader']['serializedSha256'] = sha(shader_path.read_bytes())
    shared['shader']['inspectionExport'] = relative(ROOT / 'shared/FlatSilver.shader-inspection.txt')
    write(ASSETS / 'shared/flat-silver-materials.json', shared)
    families = Counter(p['pattern'] for p in printings)
    manifest['summary'].update({'energySymbolReverses': 140, 'plainTrainerEnergyReverses': 38,
        'uniqueReverseWhiteplatePNGs': len(canonical), 'patternFamilies': dict(sorted(families.items()))})
    manifest['sourceExtractionVerified'] = True
    manifest['patternAssignmentsVerified'] = True
    manifest['deduplication'] = list(duplicates.values())
    write(ASSETS / 'manifest.json', manifest)
    write(ROOT / 'manifest.json', manifest)

    review = HOLO / 'artifacts/ascended-original'
    review.mkdir(parents=True, exist_ok=True)
    native_sheet = Image.new('RGB', (14 * 178, 10 * 193), '#202020')
    draw = ImageDraw.Draw(native_sheet)
    for i, (number, p) in enumerate(sorted(by_number.items())):
        x, y = (i % 14) * 178, (i // 14) * 193
        original = Image.open(HOLO / p['resources']['whiteplate']['png']).convert('RGB')
        native_sheet.paste(original.crop((174, 267, 338, 430)), (x + 7, y + 23))
        draw.text((x + 4, y + 4), f'{number:03d} {p["pattern"]}', fill='white')
    native_sheet.save(review / 'all-140-native-symbols.png')
    representatives = Image.new('RGB', (6 * 512, 2 * 544), '#202020')
    draw = ImageDraw.Draw(representatives)
    ordinary_by_number = {int(p['collectorNumber'].split('/')[0]): p for p in printings if not p['variantSuffix']}
    for i, (family, number) in enumerate(REFERENCES.items()):
        for j, p in enumerate((by_number[number], ordinary_by_number[number])):
            representatives.paste(Image.open(HOLO / p['resources']['whiteplate']['png']).convert('RGB'), (i * 512, j * 544 + 32))
            draw.text((i * 512 + 8, j * 544 + 8), f'{number:03d} {p["pattern"]} / {p["materialManifestName"]}', fill='white')
    representatives.save(review / 'six-native-families-versus-energy.png')
    code_sources = []
    for path in sorted((ROOT / 'evidence/code').glob('*.cs')):
        code_sources.append({'file': relative(path), 'sha256': sha(path.read_bytes())})
    assemblies = [{ 'file': str(path), 'sha256': sha(path.read_bytes())} for path in
        [INSTALL / 'Managed' / (name + '.dll') for name in ('TPCICardShaders', 'TPCI.RainierClient', 'TPCIAssetBundleSystem', 'CardDatabase.DataAccess')]]
    evidence = {'setId': 'me02.5', 'installedVersion': '1.43.0', 'installedBuild': '20260923_0452',
        'databaseSources': load(ROOT / 'evidence/database-sources.json'),
        'catalogSources': load(ROOT / 'evidence/catalog-sources.json'),
        'assemblies': assemblies, 'decompiledEvidence': code_sources,
        'summary': manifest['summary'], 'sourceExtractionVerified': True, 'runtimeUnchangedHashChecks': runtime_checks,
        'normalReverseRGBMatchesPreviousExport': sum(c['sameDecodedRGB'] for c in comparisons if not c['tcglCardId'].endswith('ph2')),
        'specialReverseRGBMatchesPreviousExport': sum(c['sameDecodedRGB'] for c in comparisons if c['tcglCardId'].endswith('ph2')),
        'comparisons': comparisons, 'classifications': classifications,
        'reviewCaptures': [relative(review / 'all-140-native-symbols.png'), relative(review / 'six-native-families-versus-energy.png')],
        'limitations': 'Original client resource extraction and symbol identity verified; no live TCGL angular capture or Holo optical/render integration performed. TCGL uses one large native symbol, which is not a reconstruction of physical foil repetition.'}
    write(HOLO / 'docs/ascended-original-evidence.json', evidence)
    print(json.dumps({k: v for k, v in evidence.items() if k in ('summary', 'runtimeUnchangedHashChecks', 'normalReverseRGBMatchesPreviousExport', 'specialReverseRGBMatchesPreviousExport')}, indent=2))


if __name__ == '__main__':
    main()
