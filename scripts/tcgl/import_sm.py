"""Offline SM integration through Holo's existing TCGL preparation format.

First run --sets sm1 ec to prepare the representative expansion and Energies.
After its end-to-end review, run without --sets for the entire source collection.
No shader/profile source edits; originals remain in the extraction library.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import argparse
import hashlib
import json
import sys
sys.dont_write_bytecode = True
import cv2
import numpy as np
from PIL import Image
from prepare_swsh_proofs import registered
from convert_30th_sources import normal_pixels
from fetch_sm_sources import NAMES

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'research/tcgl/sun-moon-series'
ENERGY = ROOT / 'research/tcgl/sun-moon-energy'
OUT = ROOT / 'public/cards/pokemon/tcgl-sm'
DATES = dict(zip(list(NAMES)[:16], ['2017-02-03', '2017-05-05', '2017-08-04', '2017-10-06', '2017-11-03', '2018-02-02', '2018-05-04', '2018-08-03', '2018-09-07', '2018-11-02', '2019-02-01', '2019-03-29', '2019-05-03', '2019-08-02', '2019-08-23', '2019-11-01']))
DATES.update(smbsp='2016-11-18', smalt='2017-02-03', **{'sm-energy': '2017-02-03'})
RARITIES = {'RareHolo': 'Holo Rare', 'RareHoloGX': 'Holo Rare GX', 'RareUltra': 'Ultra Rare',
    'RareRainbow': 'Rainbow Rare', 'RareSecret': 'Secret Rare', 'RareSecretBasicEnergy': 'Secret Rare Energy',
    'ShiningRare': 'Shining Rare', 'Shiny': 'Shiny Rare', 'ShinyGX': 'Shiny Holo GX',
    'Prism': 'Prism Star', 'CharacterRare': 'Character Rare', 'FreeBasicEnergy': 'Energy', 'CommonBasicEnergy': 'Energy'}
TYPES = dict(zip('GRWLPFDMNY', ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Dragon', 'Fairy']))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def png(path, values):
    if not path.exists():
        Image.fromarray(np.rint(np.clip(values, 0, 1) * 255).astype(np.uint8)).save(path)
    return '/'+path.relative_to(ROOT / 'public').as_posix()


def profile(effect, rarity, textured, variant):
    if variant == 'normal': return 'print-only'
    if variant == 'reverse': return 'swsh-reverse-energy'
    if rarity == 'Prism': return 'pokemon-sheen'
    if textured:
        if rarity == 'RareSecret' or rarity == 'RareSecretBasicEnergy': return 'gold-etched'
        if rarity == 'Shiny': return 'swsh-shiny-silver'
        if rarity == 'RareRainbow': return 'pokemon-sm-rainbow-triangles'
        return 'prismatic_sir_texture'
    return {'Cosmos': 'pokemon-base-set-2-cosmos', 'CrackedIce': 'pokemon-cracked-ice',
        'SunLava': 'pokemon-water-web', 'SunBeam': 'pokemon-sheen',
        'AngledPillars': 'pokemon-vertical-line', 'Rainbow': 'sv_tcgl_illustration_holo',
        'SunPillar': 'sv_tcgl_illustration_holo', 'Stamped': 'pokemon-first-movie-gold'}[effect]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--sets', nargs='+'); args = ap.parse_args()
    cv2.setNumThreads(1)
    manifest = json.loads((SOURCE / 'dataset/manifest.json').read_bytes())
    manifest += json.loads((ENERGY / 'dataset/manifest.json').read_bytes())
    records = json.loads((SOURCE / 'dataset/card-records.json').read_bytes())
    records += json.loads((ENERGY / 'dataset/card-records.json').read_bytes())
    by_id = {r['card_id']: r for r in records}
    if args.sets: manifest = [m for m in manifest if m['set_id'] in args.sets]
    shared = OUT / 'shared'; shared.mkdir(parents=True, exist_ok=True)
    empty_motif = shared / 'empty-cosmos-motif.png'
    if not empty_motif.exists(): Image.new('L', (1200, 1650), 0).save(empty_motif)

    def prepare(m):
        r = by_id[m['card_id']]; row = r['row']; cid = m['card_id']; is_energy = m['set_id'] == 'ec'
        root = ENERGY if is_energy else SOURCE
        raw, sources = {}, {}
        for kind, asset in m['assets'].items():
            if asset['status'] == 'not_applicable': continue
            if asset['status'] != 'extracted': raise ValueError('Missing exact source: ' + cid + ':' + kind)
            path = root / asset['file']
            if digest(path) != asset['texture']['png_sha256']: raise ValueError('Source hash mismatch: ' + cid)
            with Image.open(path) as image: raw[kind] = image.copy()
            sources[kind] = {**asset, 'file': path.relative_to(ROOT).as_posix(),
                             'sha256': asset['texture']['png_sha256'], 'dimensions': list(raw[kind].size)}
        variant = 'normal' if m['foil_effect'] == 'NonFoil' else 'holo' if is_energy else 'reverse' if m['variant'] == 1 else 'holo'
        rarity = m['long_form_id'].split('_')[-3]
        base = cid.removesuffix('_ph') if m['set_id'] not in ('smalt', 'smbsp') else cid
        appid = 'sm-energy-' + base.replace('_', '-') if is_energy else base.replace('_', '-', 1)
        sid = 'sm-energy' if is_energy else m['set_id']
        key = hashlib.sha256(('sm-full-card-v1' + sources['front']['sha256']).encode()).hexdigest()[:24]
        front = shared / ('front-' + key + '.png')
        if not front.exists(): registered(raw['front'], (733, 1024)).convert('RGB').save(front)
        textured = 'etch' in raw
        chosen = profile(m['foil_effect'], rarity, textured, variant)
        if cid == 'sm3-5_78': chosen = 'prismatic_sir_texture' # Tube Mewtwo is not a gold printing.
        maps = {}; deferred = variant == 'reverse' or rarity == 'Prism' or is_energy and variant == 'holo'
        dest = OUT / cid; dest.mkdir(exist_ok=True)
        if variant != 'normal':
            plate_image = registered(raw['foil'], (733, 1024))
            controls = dest / 'foil-controls.png'
            if not controls.exists(): plate_image.save(controls)
            plate = np.asarray(plate_image.convert('RGBA'), dtype=np.float32)[..., :3].mean(2) / 255
            protection = 1 - np.clip(plate * 8, 0, 1)
            # TCGL whiteplate encodes opaque print and gray subject/material regions.
            # Derive only from this exact map, never from printed-front brightness.
            body = np.clip((1 - plate) * 16, 0, 1) * (1 - protection)
            secondary = np.zeros_like(plate)
            maps['foilControls'] = '/' + controls.relative_to(ROOT / 'public').as_posix()
            maps['foil'] = png(dest / 'foil.png', plate)
            maps['protection'] = png(dest / 'protection.png', protection)
            maps['roughness'] = png(dest / 'roughness.png', (.30 + .105 * body) * (1 - secondary) + .27 * secondary)
            if textured:
                maps['body'] = png(dest / 'body.png', body)
                normal = dest / 'normal.png'
                if not normal.exists():
                    p = cv2.resize(protection, (1800, 2475), interpolation=cv2.INTER_LINEAR)
                    Image.fromarray(normal_pixels(registered(raw['etch'], (733, 1024)), p)).save(normal)
                maps['normal'] = '/' + normal.relative_to(ROOT / 'public').as_posix()
            if m['foil_effect'] == 'Cosmos':
                maps['motif'] = '/' + empty_motif.relative_to(ROOT / 'public').as_posix()
        # 'body' is authoring evidence, not an extra runtime GPU texture.
        body_path = maps.pop('body', None)
        evidence = {'tcglCardId': cid, 'tcglVariantId': m['long_form_id'], 'exportEntry': m,
            'sources': sources, 'maps': maps, 'bodyMask': body_path, 'profile': chosen,
            'treatmentStatus': 'deferred' if deferred else 'existing-material',
            'deferredEffect': 'Prism Star' if rarity == 'Prism' else 'Sun & Moon Reverse Holo' if deferred else None,
            'registration': {'unityUvBox': [145/1024, 0, 878/1024, 1], 'dimensions': [733, 1024],
                'verticalFlip': False, 'polarity': 'inverted mean RGB', 'fullCardUv': True,
                'status': 'Source-family registration; each asset binds its own front, foil and etch hashes.'},
            'conversion': {'normalDimensions': [1800, 2475], 'slopeGain': 1.03,
                'derivatives': 'Scharr CV_32F scale 1/32 before protection; bilinear continuous height',
                'embossStrength': 0, 'runtimeGeneration': False},
            'outputHashes': {k: digest(ROOT / ('public' + p)) for k, p in maps.items()},
            'physicalReview': 'TCGL supplies exact geometry, not measured groove depth. Individual physical depth and microdiamond-region evidence are not established; no secondary foil regions invented.'}
        if m['foil_effect'] == 'Cosmos': evidence['cosmosPlacement'] = {'status': 'pending', 'reason': 'Exact-copy spot placement unavailable; empty motif, no random dots.'}
        write(dest / 'evidence.json', evidence)
        number = m['printed_collector_number']; denominator = str(row.get('EN Expansion Denominator') or '')
        if number.startswith('SV') and denominator and not denominator.startswith('SV'): denominator = 'SV' + denominator
        name = m['name']
        if is_energy or rarity == 'RareSecretBasicEnergy':
            name = TYPES[row['EN Type']] + ' Energy'
        card = {'id': appid, 'localId': number, 'name': name, 'rarity': RARITIES.get(rarity, rarity),
            'collectorNumber': number + ('/' + denominator if denominator else ''),
            'category': {1: 'Pokemon', 2: 'Trainer', 3: 'Energy'}[row['category']],
            'front': front.relative_to(OUT).as_posix(), 'variants': [variant],
            'variantFronts': {variant: front.relative_to(OUT).as_posix()}, 'foil': {variant: m['foil_effect']}}
        if row.get('EN Type') in TYPES: card['types'] = [TYPES[row['EN Type']]]
        if row['category'] == 3: card['energyType'] = 'Basic' if name.endswith(' Energy') and ('Basic' in m['name'] or is_energy) else 'Special'
        if row.get('EN Evolves From'): card['evolveFrom'] = row['EN Evolves From']
        if sid in ('smalt', 'smbsp', 'sm-energy'): card['boosterIds'] = []
        surface = {'cardId': appid, 'variant': variant, 'profile': chosen, 'textured': textured,
                   'maps': maps, 'evidence': '/' + (dest / 'evidence.json').relative_to(ROOT / 'public').as_posix(),
                   'foilType': m['foil_effect'], 'tcglCardId': cid, 'tcglVariantId': m['long_form_id'],
                   'treatmentStatus': 'deferred' if deferred else 'existing-material',
                   'deferredEffect': evidence['deferredEffect']}
        return sid, card, surface

    sets, surfaces, identities = {}, [], []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for i, (sid, card, surface) in enumerate(pool.map(prepare, manifest), 1):
            s = sets.setdefault(sid, {'id': sid, 'name': 'Sun & Moon Basic Energy' if sid == 'sm-energy' else NAMES[sid],
                'releaseDate': DATES[sid], 'logo': None, 'seriesId': 'sm', 'seriesName': 'Sun & Moon',
                'assets': '/cards/pokemon/tcgl-sm', 'cards': {}})
            old = s['cards'].get(card['id'])
            if old:
                if set(old['variants']) & set(card['variants']): raise ValueError('Printing identity collision')
                old['variants'] += card['variants']; old['variantFronts'].update(card['variantFronts']); old['foil'].update(card['foil'])
            else: s['cards'][card['id']] = card
            surfaces.append(surface)
            identities.append({k: surface[k] for k in ['tcglCardId', 'tcglVariantId', 'cardId', 'variant']} | {'setId': sid})
            if i % 50 == 0: print('Prepared', i, '/', len(manifest), flush=True)
    ordered = sorted(sets.values(), key=lambda s: (s['releaseDate'], s['id']))
    for s in ordered: s['cards'] = list(s['cards'].values())
    target = ROOT / 'src/pokemon/data/sm-tcgl.generated.ts'
    target.write_text('// Offline exact TCGL Sun & Moon printings; no runtime texture generation.\n'
        'import type { TcglSvSetRecord } from "./sv-tcgl.generated.ts";\n'
        'import type { TcglSvSurface } from "./sv-tcgl-surfaces.generated.ts";\n'
        'export const tcglSmSets: readonly (TcglSvSetRecord & {seriesId:string;seriesName:string})[] = JSON.parse(' + json.dumps(json.dumps(ordered, ensure_ascii=False), ensure_ascii=False) + ');\n'
        'export const tcglSmSurfaces: readonly (TcglSvSurface & {tcglCardId:string;tcglVariantId:string;treatmentStatus:string;deferredEffect:string|null})[] = JSON.parse(' + json.dumps(json.dumps(surfaces, ensure_ascii=False), ensure_ascii=False) + ');\n', encoding='utf-8')
    write(OUT / 'printing-index.json', identities)
    write(OUT / 'import-audit.json', {'printings': len(identities), 'sets': {s['id']: len(s['cards']) for s in ordered},
        'shaderChanges': False, 'deferredEffects': ['Sun & Moon Reverse Holo', 'Prism Star']})
    print('Finished', len(identities), 'exact printings.', flush=True)


if __name__ == '__main__': main()
