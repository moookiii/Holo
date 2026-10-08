"""Import missing SV expansions, promos, alternates and Energy from exact TCGL.

Raw database rows bridge the processed export's missing Black Bolt/White Flare.
Every supplied printing keeps its own front; no printing is inferred from rarity.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import quote, urlparse
import argparse, hashlib, json, os, re
from PIL import Image
from fetch_sv_sets import ROOT, BASE, ENERGIES, fetch, write_catalog

PRODUCTS = {
    'sv04.5': ('sv4-5', 'Paldean Fates', '2024-01-26'),
    'sv06.5': ('sv6-5', 'Shrouded Fable', '2024-08-02'),
    'sv10.5w': ('rsv10-5', 'White Flare', '2025-07-18'),
    'sv10.5b': ('zsv10-5', 'Black Bolt', '2025-07-18'),
    'svp': ('svbsp', 'SVP Black Star Promos', '2023-01-06'),
    'svalt': ('svalt', 'Scarlet & Violet Alternate Printings', '2023-01-06'),
    'sve': ('sve', 'Scarlet & Violet Energy', '2023-03-31'),
}
TCGL = BASE.removesuffix('export/')

def snake(value):
    return re.sub(r'(?<!^)(?=[A-Z][a-z])', '_', value).upper()

def raw_entries(key, directory):
    index = json.loads(fetch(TCGL+'databases/index.json'))
    rows = {}; urls = []
    for revision in (0, 1):
        dbkey = f'card-database-{key}_{revision}_en_0.0'
        if dbkey not in index: continue
        url = TCGL+'databases/'+quote(index[dbkey]['data'])
        payload = fetch(url); (directory/f'raw-database-{revision}.json').write_bytes(payload)
        urls.append({'url': url, 'sha256': hashlib.sha256(payload).hexdigest()})
        for row in json.loads(payload)['rows']:
            rows[row['longFormID']] = (row, url)
    entries = []
    for row, url in rows.values():
        parts = row['longFormID'].split('_'); number = int(row['EN Card #']); suffix = parts[3]
        stem = f'{key}_en_{number:03d}_{suffix}'
        images = {'front': TCGL+f'cards/png/en/{key}/{stem}.png'}
        foil = row['Foil Effect'] != 'NonFoil'
        if foil: images['foil'] = TCGL+f'cards/png/en/{key}/{stem}.foil.png'
        if row['Foil Mask'] == 'Etched': images['etch'] = TCGL+f'cards/png/en/{key}/{stem}.etch.png'
        name = row['EN Card Name']
        entry = {'name': name, 'card_type': 'POKEMON' if row['category'] == '0x01' else 'TRAINER' if row['category'] == '0x02' else 'ENERGY',
                 'collector_number': {'numeric': number, 'full': f'{number:03d}/{row["EN Expansion Denominator"]}'},
                 'rarity': {'designation': snake(parts[4]).replace('POKE_BALL_', '').replace('MASTER_BALL_', '')},
                 'ext': {'tcgl': {'cardID': row['cardID'], 'longFormID': row['longFormID']}},
                 'images': {'tcgl': {'png': images}}, 'rawRow': row, 'rawDatabaseUrl': url}
        if foil: entry['foil'] = {'type': snake(row['Foil Effect']), 'mask': snake(row['Foil Mask'])}
        entry['types'] = [label.upper() for token, label in ENERGIES.items() if token == row['EN Type']]
        if row['EN Evolves From']: entry['stage_text'] = 'Evolves from '+row['EN Evolves From']
        else: entry['stage'] = 'BASIC'
        entries.append(entry)
    return entries, urls

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--sets', nargs='+', default=list(PRODUCTS)); args=parser.parse_args()
    index=json.loads(fetch(BASE+'index.json'))['en-US']
    generated=ROOT/'src/pokemon/data/sv-tcgl.generated.ts'
    sets=json.loads(generated.read_text(encoding='utf-8').split('= ',1)[1].rstrip().removesuffix(';'))
    for set_id in args.sets:
        key, name, date=PRODUCTS[set_id]; extra=set_id in ('svp','svalt','sve')
        dest=ROOT/f'research/tcgl/{set_id}-set'; dest.mkdir(parents=True,exist_ok=True)
        assets=ROOT/f'public/cards/pokemon/tcgl-sv/{set_id}'; assets.mkdir(parents=True,exist_ok=True)
        if key in index:
            url=BASE+index[key]['path']; payload=fetch(url); entries=json.loads(payload)
            (dest/'export.json').write_bytes(payload)
            export_sources=[{'url':url,'sha256':hashlib.sha256(payload).hexdigest()}]
        else: entries, export_sources=raw_entries(key,dest)
        (dest/'export-source.json').write_text(json.dumps(export_sources,indent=2)+'\n',encoding='utf-8')
        downloads={}
        for e in entries:
            for url in e['images']['tcgl']['png'].values(): downloads[url]=dest/'raw'/Path(urlparse(url).path).name
        (dest/'raw').mkdir(exist_ok=True)
        def preserve(item):
            url,path=item
            if not path.exists():
                tmp=path.with_suffix('.download'); tmp.write_bytes(fetch(url)); tmp.replace(path)
            with Image.open(path) as im: size,mode=list(im.size),im.mode
            return url,{'file':path.relative_to(ROOT).as_posix(),'dimensions':size,'mode':mode,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
        saved={}
        with ThreadPoolExecutor(max_workers=20) as pool:
            for count,future in enumerate(as_completed([pool.submit(preserve,item) for item in downloads.items()]),1):
                url,data=future.result(); saved[url]=data
                if count%100==0: print(f'{set_id}: preserved {count}/{len(downloads)}',flush=True)
        cards={}; printings=[]; seen=set()
        for e in entries:
            tcgl=e['ext']['tcgl']; n=e['collector_number']['numeric']; suffix=tcgl['longFormID'].split('_')[3]
            # Promos/alternates can share a printed number but have distinct art,
            # identity and finish. Never collapse those into a single card.
            number=tcgl['cardID'].removeprefix(key+'_').replace('_','-') if extra else f'{n:03d}'
            variant={'ph':'reverse','sph':'pokeball-reverse','mph':'masterball-reverse'}.get(suffix,'holo' if 'foil' in e else 'normal')
            if (number,variant) in seen: raise ValueError('Duplicate printing '+tcgl['longFormID'])
            seen.add((number,variant)); card_id=set_id+'-'+number
            front_name=number+('-'+variant if not extra and suffix!='std' else '')+'.png'
            front_path=assets/front_name; raw_front=ROOT/saved[e['images']['tcgl']['png']['front']]['file']
            if not front_path.exists(): os.link(raw_front,front_path)
            elif front_path.read_bytes()!=raw_front.read_bytes(): raise ValueError('Front changed '+card_id)
            rarity=e['rarity']['designation'].replace('_',' ').title().replace('Ace Spec','ACE SPEC')
            sources={kind:{'url':url,**saved[url]} for kind,url in e['images']['tcgl']['png'].items()}
            printing={'cardId':card_id,'number':number,'name':e['name'],'rarity':rarity,'variant':variant,'suffix':suffix,
                      'tcglCardId':tcgl['cardID'],'tcglVariantId':tcgl['longFormID'],'foil':e.get('foil'),'sources':sources,
                      'frontFile':front_name,'exportEntry':e,'exportUrl':e.get('rawDatabaseUrl',export_sources[0]['url']),'alignmentReview':'pending'}
            printings.append(printing)
            card_dir=ROOT/'research/tcgl'/card_id; card_dir.mkdir(exist_ok=True)
            for kind,source in sources.items():
                target=card_dir/Path(source['file']).name
                if not target.exists(): os.link(ROOT/source['file'],target)
            (card_dir/(variant+'-source.json')).write_text(json.dumps(printing,indent=2)+'\n',encoding='utf-8')
            if number not in cards or suffix=='std':
                clean_name=e['name']
                for token,label in ENERGIES.items(): clean_name=clean_name.replace('{'+token+'}',label)
                record={'id':card_id,'localId':f'{n:03d}','name':clean_name,'rarity':rarity,'category':e['card_type'].title(),
                        'front':front_name,'types':[v.title() for v in e.get('types',[])],'collectorNumber':e['collector_number']['full']}
                if e.get('stage'): record['stage']={'BASIC':'Basic','STAGE1':'Stage1','STAGE2':'Stage2'}.get(e['stage'],e['stage'])
                if e.get('stage_text','').startswith('Evolves from '): record['evolveFrom']=e['stage_text'][13:]
                if e['name'].endswith(' ex'): record['suffix']='ex'
                if e['card_type']=='ENERGY': record['energyType']=e.get('subtype','Basic').title()
                if e['card_type']=='TRAINER': record['trainerType']=e.get('subtype','').title()
                cards[number]=record
        catalog=[]
        for number,card in cards.items():
            ps=[p for p in printings if p['number']==number]
            catalog.append({**card,'variants':[p['variant'] for p in ps],
                            'foil':{p['variant']:p['foil']['type'] for p in ps if p['foil']},
                            'variantFronts':{p['variant']:p['frontFile'] for p in ps}})
        catalog.sort(key=lambda c:(int(c['localId']),c['id']))
        if not extra:
            meta=json.loads(fetch('https://api.tcgdex.net/v2/en/sets/'+set_id))
            if {int(c['localId']) for c in catalog}!={int(c['localId']) for c in meta['cards']}: raise ValueError('Retail checklist mismatch '+set_id)
        else: meta={}
        (dest/'sources.json').write_text(json.dumps({'exportSources':export_sources,'printings':printings},indent=2)+'\n',encoding='utf-8')
        (assets/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n',encoding='utf-8')
        sets=[s for s in sets if s['id']!=set_id]
        sets.append({'id':set_id,'name':name,'releaseDate':date,'logo':meta.get('logo')+'.webp' if meta.get('logo') else None,
                     'assets':f'/cards/pokemon/tcgl-sv/{set_id}','cards':catalog})
        sets.sort(key=lambda s:(s['releaseDate'],s['id'])); write_catalog(sets)
        # This field is intentionally outside PokemonCard: per-print fronts are
        # selected in SvTcglSurfaces, including reverse-specific TCGL art.
        text=generated.read_text(encoding='utf-8').replace('collectorNumber: string;', 'collectorNumber: string; variantFronts?: Partial<Record<import("../types.ts").PrintVariant, string>>;')
        generated.write_text(text,encoding='utf-8')
        print(f'{set_id}: complete {len(catalog)} cards, {len(printings)} exact printings',flush=True)

if __name__=='__main__': main()
