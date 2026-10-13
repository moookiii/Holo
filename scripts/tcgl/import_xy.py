"""Register acquired XY printings with their exact TCGL art and existing optics.

The three new optical treatments and sources without enough placement evidence
remain print-only. Etched normals are prepared offline by xy_etch_normal.py.
"""
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import os
import sys
sys.dont_write_bytecode = True
import numpy as np
from PIL import Image
from prepare_swsh_proofs import registered
from fetch_xy_sources import NAMES

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'research/tcgl/xy-series'
OUT = ROOT / 'public/cards/pokemon/tcgl-xy'
DATES = dict(zip(list(NAMES), ['2013-11-08','2014-02-05','2014-05-07','2014-08-13',
    '2014-11-05','2015-02-04','2015-03-25','2015-05-06','2015-08-12',
    '2015-11-04','2016-02-03','2016-02-22','2016-02-22','2016-05-02',
    '2016-08-03','2016-11-02','2013-10-12','2013-11-08']))
TYPES = dict(zip('GRWLPFDCMNY', ['Grass','Fire','Water','Lightning','Psychic','Fighting',
                               'Darkness','Colorless','Metal','Dragon','Fairy']))
RARITIES = {'RareHolo': 'Holo Rare', 'RareHoloEX': 'Holo Rare EX',
            'RareUltra': 'Ultra Rare', 'RareSecret': 'Secret Rare',
            'BreakRare': 'BREAK Rare', 'CommonBasicEnergy': 'Energy'}
# TCGL classifies these Collector Chest preview cards as Cosmos, but the
# physical 6/160, 25/160 and 33/160 printings are Sheen Holofoil.
COLLECTOR_CHEST_SHEEN = {
    'xyalt_100': 'https://pokumon.com/card/mirror-holofoil-treecko-6-160-collector-chest-special-print/',
    'xyalt_101': 'https://pokumon.com/card/mirror-holofoil-torchic-25-160-collector-chest-special-print/',
    'xyalt_102': 'https://pokumon.com/card/mirror-holofoil-mudkip-33-160-collector-chest-special-print/',
}


def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def treatment(m, row, variant):
    rarity = m['long_form_id'].split('_')[-3]
    if m['set_id'] == 'xy9-5r': return 'print-only', 'Generations Radiant Collection'
    if variant == 'normal': return 'print-only', None
    if rarity == 'BreakRare': return 'print-only', 'Gold Pokemon BREAK'
    if m['card_id'] in COLLECTOR_CHEST_SHEEN:
        assert m['set_id'] == 'xyalt' and m['foil_effect'] == 'Cosmos'
        return 'pokemon-sheen', None
    if m['assets']['etch']['status'] == 'extracted':
        # The gold Trainer secrets use the existing gold finish. Secret EX and
        # Primal cards retain the authored-normal silver/rainbow response.
        return ('prismatic_gold' if rarity == 'RareSecret' and row['category'] == 2
                else 'prismatic_sir_texture'), None
    if rarity in ('RareHoloEX','RareUltra','RareSecret'):
        return 'pokemon-sheen', None
    if variant == 'reverse':
        # TCGL supplies only the first-type motif on these five split cards.
        if m['set_id'] == 'xy11' and len(row['EN Type']) > 1:
            return 'print-only', 'Steam Siege dual-type reverse'
        return 'swsh-reverse-energy', None
    if m['set_id'] == 'xy12' and m['foil_effect'] == 'Galaxy':
        return 'print-only', 'Evolutions English starlight'
    effect = m['foil_effect']
    if effect in ('Rainbow','AngledPillars'): return 'pokemon-sheen', None
    if effect == 'CrackedIce': return 'pokemon-cracked-ice', None
    if effect == 'Tinsel': return 'pokemon-tinsel', None
    if effect == 'Thatch': return 'pokemon-crosshatch', None
    if effect == 'Galaxy': return 'pokemon-galaxy-star', None
    if effect == 'Cosmos': return 'print-only', 'Cosmos registered motif placement'
    if effect == 'FlatSilver': return 'swsh-celebrations-silver', None
    return 'print-only', 'XY promotional ' + effect


def main():
    manifest = json.loads((SOURCE / 'dataset/manifest.json').read_bytes())
    assert json.loads((SOURCE / 'dataset/validation.json').read_bytes())['status'] == 'validated'
    records = {r['card_id']: r for r in json.loads((SOURCE / 'dataset/card-records.json').read_bytes())}
    OUT.mkdir(parents=True, exist_ok=True)
    shared = OUT / 'shared'; shared.mkdir(exist_ok=True)
    def prepare(m):
        cid = m['card_id']; row = records[cid]['row']; dest = OUT / cid; dest.mkdir(exist_ok=True)
        variant = 'normal' if m['foil_effect'] == 'NonFoil' else 'reverse' if m['variant'] == 1 else 'holo'
        base = cid.removesuffix('_ph') if m['set_id'] not in ('xyalt','xybsp') else cid
        appid = base.replace('_', '-', 1)
        sources, originals = {}, {}
        for kind, asset in m['assets'].items():
            if asset['status'] == 'not_applicable': continue
            assert asset['status'] == 'extracted', cid + ':' + kind
            path = SOURCE / asset['file']; assert sha(path) == asset['texture']['png_sha256']
            target = dest / ('original-' + kind + '.png')
            if not target.exists(): os.link(path, target)
            sources[kind] = {**asset, 'file': path.relative_to(ROOT).as_posix(),
                             'publicOriginal': '/' + target.relative_to(ROOT / 'public').as_posix(),
                             'sha256': sha(target)}
            originals[kind] = Image.open(path).copy()
        key = hashlib.sha256(('xy-full-card-v1:' + sources['front']['sha256']).encode()).hexdigest()[:24]
        front = shared / ('front-' + key + '.png')
        if not front.exists(): registered(originals['front'], (733,1024)).convert('RGB').save(front)
        profile, pending = treatment(m, row, variant)
        physical_effect = 'Sheen' if cid in COLLECTOR_CHEST_SHEEN else m['foil_effect']
        maps = {}
        if profile != 'print-only':
            assert 'foil' in originals, cid
            controls = dest / 'foil-controls.png'
            if not controls.exists(): registered(originals['foil'], (733,1024)).save(controls)
            plate = dest / 'foil.png'
            if not plate.exists(): Image.open(controls).convert('L').save(plate)
            # Exact TCGL whiteplate already excludes individual text/opaque art.
            # Its grayscale motif values remain continuous; no threshold, symbol
            # synthesis, artwork brightness or rectangular protection is used.
            roughness = shared / 'smooth-roughness.png'
            if not roughness.exists(): Image.new('L', (1,1), round(.30*255)).save(roughness)
            maps = {k: '/' + p.relative_to(ROOT / 'public').as_posix() for k,p in
                    [('foil',plate),('foilControls',controls),('roughness',roughness)]}
            if 'etch' in originals:
                normal = dest / 'normal.png'
                if not normal.exists():
                    raise FileNotFoundError(f'{cid}: run scripts/tcgl/xy_etch_normal.py first')
                maps['normal'] = '/' + normal.relative_to(ROOT / 'public').as_posix()
                maps['protection'] = '/' + (dest / 'protection.png').relative_to(ROOT / 'public').as_posix()
        number = m['printed_collector_number']; denominator = str(row.get('EN Expansion Denominator') or '')
        if m['set_id'] == 'xy9-5r':
            number = 'RC' + number.removeprefix('RC'); denominator = 'RC' + denominator.removeprefix('RC')
        types = [TYPES[t] for t in row['EN Type'] if t in TYPES]
        rarity = m['long_form_id'].split('_')[-3]
        card = {'id': appid, 'localId': number, 'name': m['name'], 'rarity': RARITIES.get(rarity,rarity),
                'collectorNumber': number + ('/' + denominator if denominator else ''),
                'category': {1:'Pokemon',2:'Trainer',3:'Energy'}[row['category']],
                'front': front.relative_to(OUT).as_posix(), 'variants':[variant],
                'variantFronts': {variant: front.relative_to(OUT).as_posix()}, 'foil': {variant:physical_effect}}
        if types: card['types'] = types
        if row['category'] == 3: card['energyType'] = 'Basic' if rarity == 'CommonBasicEnergy' else 'Special'
        if row.get('EN Evolves From'): card['evolveFrom'] = row['EN Evolves From']
        if m['set_id'] in ('xyalt','xybsp','xy0'): card['boosterIds'] = []
        evidence = {'tcglCardId':cid, 'tcglVariantId':m['long_form_id'], 'printing':m, 'databaseRow':row,
                    'sources':sources, 'maps':maps, 'profile':profile,
                    'treatmentStatus':'deferred' if pending else 'existing-material', 'deferredEffect':pending,
                    'registration':{'unityUvBox':[145/1024,0,878/1024,1], 'dimensions':[733,1024],
                                    'verticalFlip':False, 'method':'Established TCGL full-card bleed removal; same source UV box for own front and foil.'},
                    'normalGeneration':bool('normal' in maps), 'shaderChanges':False,
                    'limitations': 'Pending finishes use the original clean front without simulated foil. Original etch remains byte-exact for the next finish pass.' if pending else
                                   'Existing optical family with this exact TCGL whiteplate, including its continuous printed motif and protection boundaries.'}
        if cid in COLLECTOR_CHEST_SHEEN:
            evidence['physicalFinishCorrection'] = {
                'finish':'Sheen Holofoil', 'tcglFinish':m['foil_effect'],
                'scope':'Exact 2014 Collector Chest preview printing only',
                'sources':[
                    'https://www.elitefourum.com/t/updated-6-15-15-alternate-set-card-checklist-english/11788',
                    COLLECTOR_CHEST_SHEEN[cid],
                ]}
        if 'normal' in maps:
            evidence['normalSource'] = json.loads((dest / 'normal-evidence.json').read_text(encoding='utf-8'))
        if pending == 'Cosmos registered motif placement':
            empty = dest / 'cosmos-placement-pending.png'
            if not empty.exists(): Image.new('L', (1200,1650), 0).save(empty)
            evidence['cosmosPlacement'] = {
                'status':'pending', 'coordinateDimensions':[733,1024], 'motifs':[],
                'emptyMotifPng':'/' + empty.relative_to(ROOT/'public').as_posix(),
                'sha256':sha(empty), 'active':False,
                'reason':'Exact-copy placement evidence unavailable. Empty PNG placeholder, no randomized dots or fabricated motifs.'}
        write(dest / 'evidence.json', evidence)
        surface = {'cardId':appid,'variant':variant,'profile':profile,'textured':bool('normal' in maps),'maps':maps,
                   'evidence':'/' + (dest/'evidence.json').relative_to(ROOT/'public').as_posix(),
                   'foilType':physical_effect,'tcglCardId':cid,'tcglVariantId':m['long_form_id'],
                   'treatmentStatus':evidence['treatmentStatus'],'deferredEffect':pending,
                   'originalAssets':{k:s['publicOriginal'] for k,s in sources.items()}}
        return m['set_id'], card, surface
    sets, surfaces, index = {}, [], []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for i,(sid,card,surface) in enumerate(pool.map(prepare,manifest),1):
            s = sets.setdefault(sid,{'id':sid,'name':NAMES[sid],'releaseDate':DATES[sid], 'logo':None,
                                    'seriesId':'xy','seriesName':'XY','assets':'/cards/pokemon/tcgl-xy','cards':{}})
            old = s['cards'].get(card['id'])
            if old:
                assert not set(old['variants']) & set(card['variants']), card['id']
                old['variants'] += card['variants']; old['variantFronts'].update(card['variantFronts']); old['foil'].update(card['foil'])
            else: s['cards'][card['id']] = card
            surfaces.append(surface)
            index.append({k:surface[k] for k in ['cardId','variant','tcglCardId','tcglVariantId']} | {'setId':sid})
            if i%100==0: print('Prepared',i,'/',len(manifest),flush=True)
    ordered = sorted(sets.values(),key=lambda s:(s['releaseDate'],s['id']))
    for s in ordered: s['cards'] = list(s['cards'].values())
    assert len(index) == 3416 and len({(p['cardId'],p['variant']) for p in index}) == 3416
    target = ROOT/'src/pokemon/data/xy-tcgl.generated.ts'
    target.write_text('// Exact TCGL XY printing identities. Offline assets; unsupported finishes are print-only.\n'
                      'import type { TcglSvSetRecord } from "./sv-tcgl.generated.ts";\n'
                      'import type { TcglSvSurface } from "./sv-tcgl-surfaces.generated.ts";\n'
                      'export const tcglXySets: readonly (TcglSvSetRecord & {seriesId:string;seriesName:string})[] = JSON.parse('+
                      json.dumps(json.dumps(ordered,ensure_ascii=False),ensure_ascii=False)+');\n'
                      'export const tcglXySurfaces: readonly (TcglSvSurface & {tcglCardId:string;tcglVariantId:string;treatmentStatus:string;deferredEffect:string|null;originalAssets:Record<string,string>})[] = JSON.parse('+
                      json.dumps(json.dumps(surfaces,ensure_ascii=False),ensure_ascii=False)+');\n',encoding='utf-8')
    write(OUT/'printing-index.json',index)
    pending = defaultdict(list)
    for m,surface in zip(manifest,surfaces):
        if surface['deferredEffect']:
            pending[surface['deferredEffect']].append({'name':m['name'],'setId':m['set_id'],
                'number':m['printed_collector_number'],'tcglCardId':m['card_id'],'tcglVariantId':m['long_form_id'],
                'sourceEvidence':surface['evidence'],'originalAssets':surface['originalAssets']})
    write(ROOT/'docs/xy-pending-finishes.json',dict(pending))
    write(OUT/'import-audit.json',{'printings':len(index),'sets':{s['id']:{'cards':len(s['cards']),
            'variants':sum(len(c['variants']) for c in s['cards'])} for s in ordered},
            'profiles':dict(Counter(s['profile'] for s in surfaces)),
            'pendingFamilies':{k:len(v) for k,v in pending.items()},'shaderChanges':False})
    print('Registered',len(index),'exact XY finishes.',flush=True)


if __name__ == '__main__':
    main()
    from prepare_break import main as prepare_break
    prepare_break()
