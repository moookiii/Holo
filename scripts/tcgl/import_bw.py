"""Register acquired BW printings with their exact TCGL art and existing optics.

The three new optical treatments and sources without enough placement evidence
remain print-only. Etched normals are prepared offline by bw_etch_normal.py.
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
from fetch_bw_sources import NAMES

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'research/tcgl/bw-series'
OUT = ROOT / 'public/cards/pokemon/tcgl-bw'
DATES = dict(zip(list(NAMES), ['2011-04-25','2011-08-31','2011-11-16','2012-02-08',
    '2012-05-09','2012-08-15','2012-10-05','2012-11-07','2013-02-06','2013-05-08',
    '2013-08-14','2013-11-06','2013-11-06','2011-03-04','2011-04-25']))
TYPES = dict(zip('GRWLPFDCMNY', ['Grass','Fire','Water','Lightning','Psychic','Fighting',
                               'Darkness','Colorless','Metal','Dragon','Fairy']))
RARITIES = {'RareHolo': 'Holo Rare', 'RareHoloEX': 'Holo Rare EX',
            'RareUltra': 'Ultra Rare', 'RareSecret': 'Secret Rare',
            'BreakRare': 'BREAK Rare', 'CommonBasicEnergy': 'Energy', 'Ace': 'ACE SPEC'}


def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def rarity_of(m):
    return m['long_form_id'].split('_')[-3] if m['long_form_id'] else 'Promo'


def treatment(m, row, variant):
    rarity = rarity_of(m)
    sid, cid = m['set_id'], m['card_id']
    if sid == 'bw11r': return 'print-only', 'Legendary Treasures Radiant Collection glitter and overcoat'
    if cid in ('bw11_114','bw11_115'): return 'print-only', 'Legendary Treasures entirely gold Full Art'
    if variant == 'normal': return 'print-only', None
    if m.get('identityStatus'): return 'print-only', 'TCGL printing identity and physical finish unresolved'
    if m['foil_effect'] == 'Cosmos': return 'print-only', 'Cosmos registered motif placement'
    if 'Etched' in (m['long_form_id'] or '') and m['assets']['etch']['status'] != 'extracted':
        return 'print-only', 'Exact physical etch unavailable in TCGL material references'
    if variant == 'reverse': return 'swsh-reverse-energy', None
    # BW1–BW3 Full Arts and BW4–BW6 shiny secrets carry client etch
    # silhouettes but lack the later physical full-card line engraving.
    untextured = sid in ('bw1','bw2','bw3') or sid in ('bw4','bw5','bw6') and rarity == 'RareSecret'
    if m['assets']['etch']['status'] == 'extracted' and not untextured:
        return 'prismatic_sir_texture', None
    if rarity in ('RareHoloEX','RareUltra','RareSecret','Ace'):
        return 'swsh-reverse-energy', None
    effect = m['foil_effect']
    if effect == 'Tinsel': return 'pokemon-tinsel', None
    if effect == 'CrackedIce': return 'pokemon-cracked-ice', None
    if effect == 'Thatch': return 'pokemon-crosshatch', None
    if effect in ('Rainbow','AngledPillars'): return 'swsh-reverse-energy', None
    if effect == 'Stamped': return 'print-only', 'Stamped promotional foil physical response'
    return 'print-only', 'BW promotional ' + effect


def orphan_records():
    records = []
    for original in json.loads((SOURCE / 'supplementary/orphan-bundles.json').read_bytes()):
        cid = 'bwbsp_' + str(int(original['bundleName'].rsplit('_',1)[-1]))
        front = next(a for a in original['assets'] if a['kind'] == 'front')
        # Names/numbers read from original preserved fronts; no finish ID inferred.
        name = {'bwbsp_29':'Victory Cup','bwbsp_30':'Victory Cup','bwbsp_31':'Victory Cup',
                'bwbsp_77':'Pikachu','bwbsp_78':'Raichu'}[cid]
        assets = {k: {'status':'not_applicable'} for k in ['front','foil','etch','cold_foil','cast_and_cure']}
        for asset in original['assets']:
            if asset['status'] == 'extracted': assets[asset['kind']] = {**asset,'bundle_source':original['source'],'bundle_sha256':original['sha256']}
        for texture in original['originalTextures']:
            if texture['name'] == original['bundleName']: assets['front'] = {**front,'bundle_source':original['source'],'bundle_sha256':original['sha256']}
        number = cid.split('_')[-1]
        row = {'EN Type':'L' if cid in ('bwbsp_77','bwbsp_78') else '',
               'EN Expansion Denominator':'','category':2 if int(number)<32 else 1,
               'EN Evolves From':'Pikachu' if cid=='bwbsp_78' else ''}
        records.append({'card_id':cid,'long_form_id':None,
                        'verifiedLongFormId':None,'set_id':'bwbsp','name':name,'variant':0,'foil_effect':'Unknown',
                        'variant_suffix':'','printed_collector_number':'BW'+number,'collector_number':number,
                        'assets':assets,'row':row,'identityStatus':original['identityStatus'],
                        'material_manifest':None,'bundle_name':original['bundleName'],
                        'originalMaterialManifests':original['originalMaterialManifests']})
    return records


def main():
    manifest = json.loads((SOURCE / 'dataset/manifest.json').read_bytes())
    manifest += orphan_records()
    assert json.loads((SOURCE / 'dataset/validation.json').read_bytes())['status'] == 'validated'
    records = {r['card_id']: r for r in json.loads((SOURCE / 'dataset/card-records.json').read_bytes())}
    records.update({r['card_id']: {'row': r['row']} for r in manifest if r.get('identityStatus')})
    OUT.mkdir(parents=True, exist_ok=True)
    shared = OUT / 'shared'; shared.mkdir(exist_ok=True)
    def prepare(m):
        cid = m['card_id']; row = records[cid]['row']; dest = OUT / cid; dest.mkdir(exist_ok=True)
        variant = 'normal' if m['foil_effect'] == 'NonFoil' else 'reverse' if m['variant'] == 1 else 'holo'
        base = cid.removesuffix('_ph') if m['set_id'] not in ('bwalt','bwbsp') else cid
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
        key = hashlib.sha256(('bw-full-card-v1:' + sources['front']['sha256']).encode()).hexdigest()[:24]
        front = shared / ('front-' + key + '.png')
        if not front.exists(): registered(originals['front'], (733,1024)).convert('RGB').save(front)
        profile, pending = treatment(m, row, variant)
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
            if profile == 'prismatic_sir_texture':
                normal = dest / 'normal.png'
                if not normal.exists():
                    from bw_etch_normal import convert
                    convert(m)
                maps['normal'] = '/' + normal.relative_to(ROOT / 'public').as_posix()
                maps['protection'] = '/' + (dest / 'protection.png').relative_to(ROOT / 'public').as_posix()
                maps['roughness'] = '/' + (dest / 'roughness.png').relative_to(ROOT / 'public').as_posix()
        number = m['printed_collector_number']; denominator = str(row.get('EN Expansion Denominator') or '')
        if m['set_id'] == 'bw11r':
            number = 'RC' + number.removeprefix('RC'); denominator = 'RC' + denominator.removeprefix('RC')
        types = [TYPES[t] for t in row['EN Type'] if t in TYPES]
        rarity = rarity_of(m)
        card = {'id': appid, 'localId': number, 'name': m['name'], 'rarity': 'Promo' if m.get('identityStatus') else RARITIES.get(rarity,rarity),
                'collectorNumber': number + ('/' + denominator if denominator else ''),
                'category': {1:'Pokemon',2:'Trainer',3:'Energy'}[row['category']],
                'front': front.relative_to(OUT).as_posix(), 'variants':[variant],
                'variantFronts': {variant: front.relative_to(OUT).as_posix()}, 'foil': {variant:m['foil_effect']}}
        if types: card['types'] = types
        if row['category'] == 3: card['energyType'] = 'Basic' if rarity == 'CommonBasicEnergy' else 'Special'
        if row.get('EN Evolves From'): card['evolveFrom'] = row['EN Evolves From']
        if m['set_id'] in ('bwalt','bwbsp'): card['boosterIds'] = []
        evidence = {'tcglCardId':cid, 'tcglVariantId':m.get('verifiedLongFormId',m['long_form_id']), 'printing':m, 'databaseRow':row,
                    'sources':sources, 'maps':maps, 'profile':profile,
                    'treatmentStatus':'deferred' if pending else 'existing-material', 'deferredEffect':pending,
                    'registration':{'unityUvBox':[145/1024,0,878/1024,1], 'dimensions':[733,1024],
                                    'verticalFlip':False, 'method':'Established TCGL full-card bleed removal; same source UV box for own front and foil.'},
                    'normalGeneration':bool('normal' in maps), 'shaderChanges':False,
                    'limitations': 'Pending finishes use the original clean front without simulated foil. Original etch remains byte-exact for the next finish pass.' if pending else
                                   'Existing optical family with this exact TCGL whiteplate, including its continuous printed motif and protection boundaries.'}
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
                   'foilType':m['foil_effect'],'tcglCardId':cid,'tcglVariantId':m.get('verifiedLongFormId',m['long_form_id']),
                   'treatmentStatus':evidence['treatmentStatus'],'deferredEffect':pending,
                   'originalAssets':{k:s['publicOriginal'] for k,s in sources.items()}}
        return m['set_id'], card, surface
    sets, surfaces, index = {}, [], []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for i,(sid,card,surface) in enumerate(pool.map(prepare,manifest),1):
            s = sets.setdefault(sid,{'id':sid,'name':NAMES[sid],'releaseDate':DATES[sid], 'logo':None,
                                    'seriesId':'bw','seriesName':'BW','assets':'/cards/pokemon/tcgl-bw','cards':{}})
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
    assert len(index) == 2689 and len({(p['cardId'],p['variant']) for p in index}) == 2689
    target = ROOT/'src/pokemon/data/bw-tcgl.generated.ts'
    target.write_text('// Exact TCGL BW printing identities. Offline assets; unsupported finishes are print-only.\n'
                      'import type { TcglSvSetRecord } from "./sv-tcgl.generated.ts";\n'
                      'import type { TcglSvSurface } from "./sv-tcgl-surfaces.generated.ts";\n'
                      'export const tcglBwSets: readonly (TcglSvSetRecord & {seriesId:string;seriesName:string})[] = JSON.parse('+
                      json.dumps(json.dumps(ordered,ensure_ascii=False),ensure_ascii=False)+');\n'
                      'export const tcglBwSurfaces: readonly (TcglSvSurface & {tcglCardId:string;tcglVariantId:string;treatmentStatus:string;deferredEffect:string|null;originalAssets:Record<string,string>})[] = JSON.parse('+
                      json.dumps(json.dumps(surfaces,ensure_ascii=False),ensure_ascii=False)+');\n',encoding='utf-8')
    write(OUT/'printing-index.json',index)
    pending = defaultdict(list)
    for m,surface in zip(manifest,surfaces):
        if surface['deferredEffect']:
            pending[surface['deferredEffect']].append({'name':m['name'],'setId':m['set_id'],
                'number':m['printed_collector_number'],'tcglCardId':m['card_id'],'tcglVariantId':m.get('verifiedLongFormId',m['long_form_id']),
                'sourceEvidence':surface['evidence'],'originalAssets':surface['originalAssets']})
    write(ROOT/'docs/bw-pending-finishes.json',dict(pending))
    write(OUT/'import-audit.json',{'printings':len(index),'sets':{s['id']:{'cards':len(s['cards']),
            'variants':sum(len(c['variants']) for c in s['cards'])} for s in ordered},
            'profiles':dict(Counter(s['profile'] for s in surfaces)),
            'pendingFamilies':{k:len(v) for k,v in pending.items()},'shaderChanges':False})
    print('Registered',len(index),'exact BW finishes.',flush=True)


if __name__ == '__main__':
    main()

