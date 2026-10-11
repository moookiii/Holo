"""Acquire, review and convert Mega-series printings through Holo's TCGL pipeline.

Run --slice first. Conversion requires an inspected source-family review JSON;
--batch is gated on the successful live slice report. Originals are immutable,
downloads are bounded/cached, and each completed batch is validated at source.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from collections import Counter
import argparse, hashlib, json, shutil
import cv2
import numpy as np
from PIL import Image, ImageDraw
from fetch_sv_sets import fetch, BASE, ENERGIES
import convert_151_set as converter
from convert_sv_sets import black_floor

ROOT = converter.ROOT
SETS = [
    ('me01', 'me1', 'Mega Evolution', '2025-09-26'),
    ('me02', 'me2', 'Phantasmal Flames', '2025-11-14'),
    ('me02.5', 'me2-5', 'Ascended Heroes', '2026-01-30'),
    ('me03', 'me3', 'Perfect Order', '2026-03-27'),
    ('me04', 'me4', 'Chaos Rising', '2026-05-22'),
    ('me05', 'me5', 'Pitch Black', '2026-07-17'),
    ('mee', 'mee', 'Mega Evolution Energy', '2025-09-26'),
]
SLICE = {'me01': {1,2,3,4,5,6,7,8,9,10,12,133,155,177,187}, 'me02.5': {1}, 'mee': set(range(1,9))}
REVIEW = ROOT / 'research/tcgl/mega-series/source-review.json'

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(value, indent=2, ensure_ascii=True) + '\n'
    if not path.exists() or path.read_text(encoding='utf-8') != content:
        path.write_text(content, encoding='utf-8')

def preserve(url, path):
    if not path.exists():
        content = fetch(url)
        path.parent.mkdir(parents=True, exist_ok=True)
        temp = path.with_suffix('.download')
        temp.write_bytes(content); temp.replace(path)
    with Image.open(path) as im:
        im.load()
        if im.size not in ((733,1024),(367,512)): raise ValueError(f'Unexpected source size: {url}: {im.size}')
        result = {'url': url, 'file': path.relative_to(ROOT).as_posix(), 'dimensions': list(im.size), 'mode': im.mode, 'sha256': converter.digest(path)}
    return result

def identity(e, sid):
    tcgl = e['ext']['tcgl']; suffix = tcgl['longFormID'].split('_')[3]
    if suffix not in ('std','ph','ph2'): raise ValueError('Unknown exact printing: '+tcgl['longFormID'])
    variant = {'ph':'reverse','ph2':'special-reverse'}.get(suffix, 'holo' if 'foil' in e else 'normal')
    return {'cardId': f"{sid}-{e['collector_number']['numeric']:03d}", 'number': f"{e['collector_number']['numeric']:03d}",
        'name': e['name'], 'rarity': e.get('rarity', {'designation':'ENERGY'})['designation'].replace('_',' ').title(),
        'collectorNumber': e['collector_number']['full'], 'variant': variant, 'suffix': suffix,
        'tcglCardId': tcgl['cardID'], 'tcglVariantId': tcgl['longFormID'], 'foil': e.get('foil'),
        'images': e['images']['tcgl']['png'], 'exportEntry': tcgl['cardID'], 'tags': e.get('tags', [])}

def acquire(sid, key, numbers=None):
    archive = ROOT/f'research/tcgl/mega-series/{key}'
    archive.mkdir(parents=True,exist_ok=True)
    index_path=ROOT/'research/tcgl/mega-series/export-index.json'
    if not index_path.exists(): index_path.write_bytes(fetch(BASE+'index.json'))
    index=json.loads(index_path.read_bytes())['en-US']; export_url=BASE+index[key]['path']
    export=archive/'export.json'
    if not export.exists(): export.write_bytes(fetch(export_url))
    entries=json.loads(export.read_bytes())
    expected={'me01':188,'me02':130,'me02.5':295,'me03':124,'me04':122,'me05':120}
    if sid in expected and {e['collector_number']['numeric'] for e in entries} != set(range(1,expected[sid]+1)):
        raise ValueError('Incomplete published checklist: '+sid)
    write(archive/'export-source.json', {'url':export_url,'sha256':converter.digest(export),'entryCount':len(entries)})
    selected=[e for e in entries if numbers is None or e['collector_number']['numeric'] in numbers]
    printings=[identity(e,sid) for e in selected]
    if len({(p['cardId'],p['variant']) for p in printings})!=len(printings): raise ValueError('Duplicate exact printing')
    jobs={}
    for p in printings:
        for kind,u in p['images'].items():
            path=ROOT/f"research/tcgl/{p['cardId']}/{u.rsplit('/',1)[1]}"
            jobs[u]=path
        if ('ETCHED' in (p.get('foil') or {}).get('mask','')) != ('etch' in p['images']): raise ValueError('Etch pairing mismatch: '+p['tcglVariantId'])
    with ThreadPoolExecutor(max_workers=16) as pool:
        saved={}
        for i,(url,result) in enumerate(zip(jobs,pool.map(lambda u: preserve(u,jobs[u]), jobs)),1):
            saved[url]=result
            if i%100==0:print(f'{sid}: decoded {i}/{len(jobs)} source assets',flush=True)
    assets=ROOT/f'public/cards/pokemon/tcgl-me/{sid}'; assets.mkdir(parents=True,exist_ok=True)
    for p in printings:
        p['sources']={kind:saved[u] for kind,u in p['images'].items()}
        p['exportSource']={'url':export_url,'sha256':converter.digest(export),'file':export.relative_to(ROOT).as_posix()}
        p['frontFile']=p['number']+'.png'
        dest=assets/p['frontFile']; raw=ROOT/p['sources']['front']['file']
        if dest.exists() and converter.digest(dest)!=p['sources']['front']['sha256']: raise ValueError('Front conflict')
        if not dest.exists(): shutil.copyfile(raw,dest)
    write(archive/'sources.json',{'setId':sid,'tcglKey':key,'printings':printings})
    print(f'{sid}: acquired/decoded {len(saved)} originals, {len(printings)} exact printings',flush=True)
    return selected,printings

def review_sheet(printings, stem):
    # Each full-card source is paired with its front and coverage overlay.
    rows=[]
    for p in printings:
        if 'foil' not in p['sources']: continue
        front=Image.open(ROOT/p['sources']['front']['file']).convert('RGB')
        foil=Image.open(ROOT/p['sources']['foil']['file']).convert('RGBA')
        rgba=np.asarray(foil,np.float32)/255
        floor,_=black_floor(p['sources']['foil'])
        coverage=np.clip((rgba[...,:3].mean(2)-floor)/(1-floor),0,1)*rgba[...,3]
        overlay=Image.blend(front,Image.new('RGB',front.size,(0,210,130)),.35)
        overlay=Image.composite(overlay,front,Image.fromarray(np.rint(coverage*255).astype('uint8')).resize(front.size,Image.Resampling.BILINEAR))
        images=[front,foil.convert('RGB'),overlay]
        if 'etch' in p['sources']: images.append(Image.open(ROOT/p['sources']['etch']['file']).convert('RGB'))
        row=Image.new('RGB',(4*245,375),'#222222'); draw=ImageDraw.Draw(row)
        for i,im in enumerate(images): row.paste(im.resize((245,342)),(i*245,28))
        draw.text((4,4),p['tcglVariantId'],fill='white');rows.append(row)
    for start in range(0,len(rows),6):
        sheet=Image.new('RGB',(980,375*len(rows[start:start+6])),'#222222')
        for i,row in enumerate(rows[start:start+6]):sheet.paste(row,(0,i*375))
        path=ROOT/f'artifacts/mega-series/source-review/{stem}-{start//6+1}.jpg';path.parent.mkdir(parents=True,exist_ok=True);sheet.save(path,quality=95)

def validate_special_reverse_sources(printings):
    """Reject known incorrect special motifs before ANY conversion writes.

    A separate variant ID is not proof of distinct geometry. ASC's published
    ph2 sources currently duplicate ph, including the packed TCGL textures.
    Never turn those into an apparently completed special reverse again.
    """
    ordinary = {p['cardId']: p for p in printings if p['variant'] == 'reverse'}
    duplicates = []
    for p in printings:
        if p['variant'] != 'special-reverse':
            continue
        paired = ordinary.get(p['cardId'])
        if paired is None:
            raise ValueError('Full ordinary/special source pairing required: ' + p['cardId'])
        if p['sources']['foil']['sha256'] == paired['sources']['foil']['sha256']:
            duplicates.append(p['tcglVariantId'])
    if duplicates:
        raise ValueError(f'{len(duplicates)} special reverse foil sources duplicate ordinary Energy motifs; '
            'authentic special pattern sources are unavailable. No conversion performed. '
            'See docs/ascended-reverse-audit.json. First affected printing: ' + duplicates[0])

def convert(sid, printings):
    validate_special_reverse_sources(printings)
    review=json.loads(REVIEW.read_text())
    if not review.get('inspected'):raise ValueError('Source review must be inspected before conversion')
    converter.ASSETS=ROOT/f'public/cards/pokemon/tcgl-me/{sid}';converter.OUT=converter.ASSETS/'tcgl';converter.OUT.mkdir(exist_ok=True)
    converter.PUBLIC_BASE=f'/cards/pokemon/tcgl-me/{sid}';converter.PROFILE_PREFIX='sv_tcgl_'
    converter.FOIL_NATIVE=True;converter.OMIT_HEIGHT=True
    converter.BODY_EVIDENCE=True
    def build(p):
        p['alignmentReview']={'status':'source-family-reviewed','verticalFlip':False,'cropOrOffset':False,
            'etchPolarity':'Inverted mean RGB; white grooves recessed.' if 'etch' in p['sources'] else 'Smooth; no etch source.',
            'method':review['method'],'capture':review['captures'],'holoFrontSha256':p['sources']['front']['sha256']}
        if 'foil' in p['sources']:p['foilBlackFloor'],p['foilBlackFloorRgb']=black_floor(p['sources']['foil'])
        reserved=p['rarity'] in ('Mega Attack Rare','Mega Hyper Rare')
        if reserved:p['treatment']='sir_texture'
        evidence=converter.OUT/f"{p['number']}-{p['variant']}-evidence.json"
        signature=hashlib.sha256(json.dumps([p['sources'],converter.digest(Path(converter.__file__)),converter.digest(REVIEW),1],sort_keys=True).encode()).hexdigest()
        if evidence.exists():
            old=json.loads(evidence.read_text())
            if old.get('inputSignature')==signature and all((converter.OUT/name).exists() and converter.digest(converter.OUT/name)==sha for name,sha in old['maps'].items()):
                result=dict(old['surfaceRecord'])
                if reserved:
                    result['profile']='mega-attack-rare' if p['rarity']=='Mega Attack Rare' else 'mega-hyper-rare'
                    result.pop('treatmentStatus',None)
                return result
        result=converter.convert(p,False)
        if result:
            if result['textured']:result['profile']='prismatic_sir_texture'
            elif p['rarity']=='Double Rare':result['profile']='pokemon151_ex_holo'
            if reserved:result['profile']='mega-attack-rare' if p['rarity']=='Mega Attack Rare' else 'mega-hyper-rare'
            result['tcglVariantId']=p['tcglVariantId']
            data=json.loads(evidence.read_text());data['exportSource']=p['exportSource'];data['collectorNumber']=p['collectorNumber']
            data['opticalStatus']='dedicated-mega-rarity; photo-reviewed; docs/mega-optics.md' if reserved else 'existing-rarity-finish; source-family-reviewed'
            data['inputSignature']=signature;data['surfaceRecord']=result
            write(evidence,data)
            for name,u in result['maps'].items():
                with Image.open(ROOT/'public'/u.lstrip('/')) as im:
                    im.load()
                    if name=='normal' and (im.size!=(1800,2475) or im.mode!='RGB'):raise ValueError('Invalid normal')
        return result
    with ThreadPoolExecutor(max_workers=4) as pool: surfaces=[r for r in pool.map(build,printings) if r]
    write(converter.OUT/'manifest.json',surfaces)
    print(f'{sid}: converted/validated {len(surfaces)} surfaces',flush=True)
    return surfaces

def emit():
    sets=[];surfaces=[]
    for sid,key,name,date in SETS:
        archive=ROOT/f'research/tcgl/mega-series/{key}'
        if not (archive/'sources.json').exists():continue
        source=json.loads((archive/'sources.json').read_bytes()); entries=json.loads((archive/'export.json').read_bytes()); by_variant={e['ext']['tcgl']['longFormID']:e for e in entries}
        cards={}
        for p in source['printings']:
            e=by_variant[p['tcglVariantId']];card=cards.setdefault(p['cardId'],{'id':p['cardId'],'localId':p['number'],'name':p['name'],'rarity':p['rarity'],'category':e['card_type'].title(),
                'front':p['frontFile'],'types':[v.title() for v in e.get('types',[])],'collectorNumber':p['collectorNumber'],'variants':[],'foil':{},'variantFronts':{}})
            card['variants'].append(p['variant']);card['variantFronts'][p['variant']]=p['frontFile']
            if p['foil']:card['foil'][p['variant']]=p['foil']['type']
            if e.get('stage'):card['stage']={'BASIC':'Basic','STAGE1':'Stage1','STAGE2':'Stage2'}.get(e['stage'],e['stage'])
            if e.get('subtype'):card['energyType' if e['card_type']=='ENERGY' else 'trainerType']=e['subtype'].title()
            if e['name'].endswith(' ex'):card['suffix']='ex'
            for token,label in ENERGIES.items():card['name']=card['name'].replace('{'+token+'}',label)
        ordered=sorted(cards.values(),key=lambda c:int(c['localId']))
        sets.append({'id':sid,'name':name,'releaseDate':date,'logo':f'https://assets.tcgdex.net/en/me/{sid}/logo.webp' if sid != 'mee' else None,'seriesId':'me','seriesName':'Mega Evolution','assets':f'/cards/pokemon/tcgl-me/{sid}','cards':ordered})
        write(ROOT/f'public/cards/pokemon/tcgl-me/{sid}/catalog.json',{'setId':sid,'cards':ordered})
        manifest=ROOT/f'public/cards/pokemon/tcgl-me/{sid}/tcgl/manifest.json'
        if manifest.exists():surfaces.extend(json.loads(manifest.read_text()))
    text='// Generated by scripts/tcgl/mega_series.py; exact TCGL print identities.\nimport type { TcglSvSetRecord } from "./sv-tcgl.generated.ts";\nimport type { TcglSvSurface } from "./sv-tcgl-surfaces.generated.ts";\nexport const tcglMegaSets: readonly (TcglSvSetRecord & { seriesId: string; seriesName: string })[] = '+json.dumps(sets,indent=2)+';\nexport const tcglMegaSurfaces: readonly (TcglSvSurface & { treatmentStatus?: "deferred"; tcglVariantId: string })[] = '+json.dumps(surfaces,indent=2)+';\n'
    (ROOT/'src/pokemon/data/mega-tcgl.generated.ts').write_text(text,encoding='utf-8')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--slice',action='store_true');parser.add_argument('--batch',nargs='+');parser.add_argument('--convert',action='store_true');parser.add_argument('--sheets',action='store_true');args=parser.parse_args()
    cv2.setNumThreads(1)
    if args.batch:
        gate=ROOT/'artifacts/mega-series/vertical-slice/report.json'
        if not gate.exists() or not json.loads(gate.read_text()).get('passed'):raise ValueError('Complete live vertical slice before bulk acquisition')
    for sid,key,_,_ in SETS:
        if args.slice and sid not in SLICE:continue
        if args.batch and sid not in args.batch:continue
        if args.slice or args.batch:
            _,printings=acquire(sid,key,SLICE[sid] if args.slice else set(range(1,9)) if sid=='mee' else None)
        else:
            path=ROOT/f'research/tcgl/mega-series/{key}/sources.json'
            if not path.exists():continue
            printings=json.loads(path.read_text())['printings']
        if args.sheets:review_sheet(printings,sid)
        if args.convert:convert(sid,printings)
    emit()

if __name__=='__main__':main()
