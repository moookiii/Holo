"""Extract ASC reverse resources from the installed TCGL client and original CDN.

No Malie requests, renderer changes, cropping, resampling, or synthesized masks.
Run --probe for Entei, then --all after visually reviewing its original textures.
Requires UnityPy 1.25.0, Pillow and requests; reuses only the binary table decoder.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import sys

import requests
import UnityPy
from PIL import Image

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).parent / 'unity_source'))
from pipeline import database

HOLO = Path(__file__).resolve().parents[2]
ROOT = HOLO / 'research/tcgl/ascended-original'
USER = Path.home()
INSTALL = USER / 'The Pokémon Company International/Pokémon Trading Card Game Live/Pokemon TCG Live_Data'
CACHE = USER / 'AppData/LocalLow/Unity/pokemon_Pokemon TCG Live'
CONFIG = USER / 'AppData/LocalLow/pokemon/Pokemon TCG Live/config-cache'
ASSETS = HOLO / 'public/cards/pokemon/tcgl-ascended-original'
FIELDS = {'front': '_c', 'whiteplate': '_w', 'etch': '_e', 'coldFoil': '_cf', 'castAndCure': '_cc'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def relative(path):
    return path.relative_to(HOLO).as_posix()


def preserve(path, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        shutil.copyfile(path, target)
    assert sha(path.read_bytes()) == sha(target.read_bytes())
    return {'sourceFile': str(path), 'file': relative(target), 'sha256': sha(target.read_bytes())}


def fetch(url, target):
    if not target.exists():
        response = requests.get(url, timeout=(15, 60))
        response.raise_for_status()
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix('.download')
        temporary.write_bytes(response.content)
        temporary.replace(target)
    return target


def catalogs():
    # These strings were decoded from the installed resources.assets GameVersion
    # and GameSettingsEndpointSettings, not discovered by trying asset URLs.
    settings_url = 'https://cdn.studio-prod.pokemon.com/rainier/GameSettings/1.43.0/GameSettings.json'
    settings_path = fetch(settings_url, ROOT / 'evidence/game-settings.json')
    settings = json.loads(settings_path.read_bytes())
    base = settings['data']['windowsplayer_contentpath']
    source = CONFIG / 'asset-bundle-manifest_0.0.json'
    source_record = preserve(source, ROOT / 'evidence/asset-bundle-manifest_0.0.json')
    dates = json.loads(json.loads(source.read_bytes())['keys']['manifest']['contentString'])['directories']
    index, history, sources = {}, {}, []
    for date in dates:
        name = 'manifest_en_' + date
        target = ROOT / 'evidence/catalogs' / name
        # Reuse original Unity catalogs already preserved from this exact client.
        previous = USER / 'TCGL-SWSH-extraction/evidence/manifests' / name
        url = base + date + '/' + name
        if previous.exists() and not target.exists():
            preserve(previous, target)
        fetch(url, target)
        digest = sha(target.read_bytes())
        env = UnityPy.load(str(target))
        tree = next(o.read_typetree() for o in env.objects if o.type.name == 'MonoBehaviour')
        write(target.with_suffix('.json'), tree)
        sources.append({'url': url, 'file': relative(target), 'sha256': digest, 'entries': len(tree['assetList'])})
        for asset in tree['assetList']:
            entry = {'url': base + date + '/' + asset.get('s3Folder', '').replace('0.0/', '') + asset['assetName'],
                     'catalogUrl': url, 'catalogSha256': digest, **asset}
            key = asset['assetName'].lower()
            history.setdefault(key, []).append(entry)
            index[key] = entry
    write(ROOT / 'evidence/catalog-index.json', index)
    write(ROOT / 'evidence/catalog-history.json', history)
    write(ROOT / 'evidence/catalog-sources.json', {
        'settings': {'url': settings_url, 'file': relative(settings_path), 'sha256': sha(settings_path.read_bytes())},
        'datedCatalogConfig': source_record, 'catalogs': sources, 'effectiveBundles': len(index)})
    return index


def inventory():
    rows, sources = [], []
    for path in sorted(CONFIG.glob('card-database-me2-5_*_en_*.json')):
        record = preserve(path, ROOT / 'evidence/databases' / path.name)
        table = database(path)
        sources.append({**record, 'revision': table['revision'], 'rows': len(table['rows'])})
        rows.extend(table['rows'])
    assert len({r['cardID'] for r in rows}) == len(rows)
    assert len([r for r in rows if r['variant'] == 1]) == 318
    write(ROOT / 'evidence/card-database-decoded.json', rows)
    write(ROOT / 'evidence/database-sources.json', sources)
    return rows


def acquire(name, index):
    source = index[name]
    target = ROOT / 'original-bundles' / (name + '.bundle')
    if not target.exists():
        cached = CACHE / name / source['hash'] / '__data'
        if cached.exists():
            preserve(cached, target)
        else:
            fetch(source['url'], target)
    assert target.read_bytes().startswith(b'UnityFS\0')
    return target, {'file': relative(target), 'sha256': sha(target.read_bytes()), **source}


def texture(obj, path, bundle):
    t = obj.read()
    im = t.image  # UnityPy's documented top-down PNG decoding, no further flip.
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        im.save(path)
    with Image.open(path) as check:
        check.load()
        assert check.size == im.size and check.mode == im.mode and check.tobytes() == im.tobytes()
    serialized = ROOT / 'serialized' / bundle['assetName'] / (str(obj.path_id) + '.bin')
    serialized.parent.mkdir(parents=True, exist_ok=True)
    if not serialized.exists():
        serialized.write_bytes(obj.get_raw_data())
    return {'name': t.m_Name, 'pathID': obj.path_id, 'serializedFile': obj.assets_file.name,
            'dimensions': list(im.size), 'mode': im.mode, 'unityFormat': int(t.m_TextureFormat),
            'mipCount': t.m_MipCount, 'textureSettings': t.m_TextureSettings.__dict__,
            'png': relative(path), 'pngSha256': sha(path.read_bytes()), 'pixelSha256': sha(im.tobytes()),
            'rgbaSha256': sha(im.convert('RGBA').tobytes()),
            'serialized': relative(serialized), 'serializedSha256': sha(serialized.read_bytes()),
            'orientation': 'UnityPy 1.25.0 default top-down PNG decode; no extra flip, crop, resize or offset',
            'bundle': bundle}


def card_bundle(name, index):
    path, source = acquire(name, index)
    checkpoint = ROOT / 'evidence/cards' / (name + '.json')
    if checkpoint.exists():
        old = json.loads(checkpoint.read_bytes())
        if old['bundle']['sha256'] == source['sha256'] and all(
                (HOLO / t['png']).exists() and sha((HOLO / t['png']).read_bytes()) == t['pngSha256']
                for t in old['textures'].values()):
            return old
    env = UnityPy.load(str(path))
    result = {'bundle': source, 'containers': list(env.container), 'manifests': {}, 'textures': {}}
    for obj in env.objects:
        name = obj.peek_name() or ''
        if obj.type.name == 'MonoBehaviour' and name.startswith('MaterialManifest'):
            result['manifests'][name] = {'pathID': obj.path_id, 'tree': obj.read_typetree()}
        elif obj.type.name == 'Texture2D':
            output = (ASSETS / 'whiteplates' if '_wp_' in name else ROOT / 'fronts') / (name + '.png')
            result['textures'][name] = texture(obj, output, source)
    write(checkpoint, result)
    return result


def shared(index):
    path, source = acquire('shadersbundle', index)
    env = UnityPy.load(str(path))
    result = {'bundle': source, 'containers': list(env.container), 'materials': [], 'textures': {}, 'shader': {}}
    selected = []
    for obj in env.objects:
        if obj.type.name == 'Shader':
            tree = obj.read_typetree()
            if tree['m_ParsedForm']['m_Name'] == 'TPCi/Cards3D/HoloFoil/FlatSilver':
                result['shader'] = {'pathID': obj.path_id, 'tree': tree}
                out = ROOT / 'shared/FlatSilver.shader-inspection.txt'
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_text(obj.read().export(), encoding='utf-8')
                (ROOT / 'shared/FlatSilver.shader.serialized').write_bytes(obj.get_raw_data())
        elif obj.type.name == 'Material' and 'FlatSilver' in (obj.peek_name() or ''):
            tree = obj.read_typetree()
            result['materials'].append({'pathID': obj.path_id, 'tree': tree})
            selected.extend(v['m_Texture']['m_PathID'] for k, v in tree['m_SavedProperties']['m_TexEnvs']
                            if v['m_Texture']['m_FileID'] == 0 and v['m_Texture']['m_PathID'])
    for obj in env.objects:
        if obj.path_id in selected and obj.type.name == 'Texture2D':
            name = obj.peek_name()
            result['textures'][name] = texture(obj, ASSETS / 'shared' / (name + '.png'), source)
    result['runtimeDefaults'] = {'_OverallBrightness': 1, '_FoilOnSmoothness': 0, '_Smoothness': 0,
        '_Glossiness': 0, '_Metallic': 0.8, '_NonFoilsheen': 0, '_ShadowDarknessLimit': 0.7,
        '_CCPatternTex': None, '_UseCCFoil': 0, '_CardLighting_On': 0, '_LightDirection': [0, 0, -1, 0]}
    result['runtimeDefaultSource'] = 'Installed CardMaterialProperties.Default(); Card3DGraphicLoader supplies scene light direction and edge-shading setting.'
    write(ASSETS / 'shared/flat-silver-materials.json', result)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--all', action='store_true')
    parser.add_argument('--probe', action='store_true')
    parser.add_argument('--workers', type=int, default=8)
    args = parser.parse_args()
    index = catalogs()
    rows = inventory()
    reverses = [r for r in rows if r['variant'] == 1 and (args.all or r['EN Card #'] == '25')]
    names = sorted({f"me2-5_en_{int(r['EN Card #']):03d}" for r in reverses})
    print('Original catalogs resolved;', len(names), 'card bundles selected.', flush=True)
    bundles = {}
    def process(name):
        return name, card_bundle(name, index)
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for i, (name, data) in enumerate(pool.map(process, names), 1):
            bundles[name] = data
            if i % 20 == 0 or i == len(names):
                print('Extracted', i, '/', len(names), flush=True)
    shared_resources = shared(index)
    printings = []
    for row in reverses:
        number = int(row['EN Card #'])
        bundle = bundles[f'me2-5_en_{number:03d}']
        suffix = row['Variant Suffix'] or ''
        manifest_name = 'MaterialManifest_ph' + suffix
        manifest = bundle['manifests'][manifest_name]
        tree = manifest['tree']
        resources = {}
        for kind, field in FIELDS.items():
            ref = tree[field]
            resources[kind] = bundle['textures'][ref] if ref else None
        assert resources['whiteplate'] is not None
        ordinary = bundle['textures'][bundle['manifests']['MaterialManifest_ph']['tree']['_w']]
        printings.append({'cardId': f'me02.5-{number:03d}', 'name': row['EN Card Name'],
            'collectorNumber': f'{number:03d}/217', 'tcglCardId': row['cardID'], 'tcglLongFormId': row['longFormID'],
            'variant': row['variant'], 'variantSuffix': suffix, 'energyTypeCode': row['EN Type'],
            'foilEffect': row['Foil Effect'], 'foilMask': row['Foil Mask'],
            'materialManifestName': manifest_name, 'materialManifest': manifest,
            'resources': resources, 'differsFromOrdinaryReverse': resources['whiteplate']['rgbaSha256'] != ordinary['rgbaSha256'],
            'specialPattern': None, 'patternAssignmentStatus': 'native-texture-awaiting-symbol-review' if suffix else 'native-energy-or-plain-reverse'})
    report = {'setId': 'me02.5', 'source': 'Original installed TCGL 1.43.0 / native Unity bundles from official catalog URLs',
        'scope': 'all-English-reverses' if args.all else 'Entei-probe', 'printings': printings,
        'sharedMaterialFile': relative(ASSETS / 'shared/flat-silver-materials.json'),
        'summary': {'reversePrintings': len(printings), 'specialReverses': sum(bool(p['variantSuffix']) for p in printings),
            'specialSourcesDifferentFromOrdinary': sum(bool(p['variantSuffix']) and p['differsFromOrdinaryReverse'] for p in printings)},
        'alignment': 'Original square packed textures, full UV domain preserved. Holo integration must deliberately unpack the card domain; no extraction-time resize/crop.',
        'rendererModified': False, 'liveOpticsValidated': False,
        'sharedPatterns': 'ASC symbols reside in per-card _w textures. Shared FlatSilver resources animate the finish, not the ball/energy geometry.'}
    write(ASSETS / 'manifest.json', report)
    write(ROOT / 'manifest.json', report)
    print(json.dumps(report['summary']), flush=True)


if __name__ == '__main__':
    main()
