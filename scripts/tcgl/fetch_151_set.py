"""Preserve exact English 151 TCGL printings, fronts, foil and etch bytes."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse
import hashlib,json
from PIL import Image
from fetch_prismatic_set import fetch
ROOT=Path(__file__).resolve().parents[2]
DEST=ROOT/'research/tcgl/151-set'
ASSETS=ROOT/'public/cards/pokemon/151'
BASE='https://cdn.malie.io/file/malie-io/tcgl/export/'
def main():
    DEST.mkdir(parents=True,exist_ok=True);(DEST/'raw').mkdir(exist_ok=True);ASSETS.mkdir(parents=True,exist_ok=True)
    index=json.loads(fetch(BASE+'index.json'));url=BASE+index['en-US']['sv3-5']['path'];payload=fetch(url);entries=json.loads(payload)
    (DEST/'export.json').write_bytes(payload)
    (DEST/'export-source.json').write_text(json.dumps({'url':url,'sha256':hashlib.sha256(payload).hexdigest()},indent=2)+'\n')
    assets={};printings=[];cards={};seen=set()
    for e in entries:
        n=e['collector_number']['numeric'];number=f'{n:03d}';tcgl=e['ext']['tcgl'];suffix=tcgl['longFormID'].split('_')[3]
        if suffix not in ('std','ph'):raise ValueError('Unknown variant '+suffix)
        variant='reverse' if suffix=='ph' else 'holo' if 'foil' in e else 'normal'
        if (n,variant) in seen:raise ValueError('Duplicate printing')
        seen.add((n,variant));rarity=e['rarity']['designation'].replace('_',' ').title()
        printings.append({'cardId':'sv03.5-'+number,'number':number,'name':e['name'],'rarity':rarity,'variant':variant,'suffix':suffix,'tcglCardId':tcgl['cardID'],'tcglVariantId':tcgl['longFormID'],'foil':e.get('foil'),'images':e['images']['tcgl']['png']})
        for u in e['images']['tcgl']['png'].values():assets[u]=DEST/'raw'/Path(urlparse(u).path).name
        if suffix=='std':
            record={'id':'sv03.5-'+number,'localId':number,'name':e['name'],'rarity':rarity,'category':e['card_type'].title().replace('Pokemon','Pokemon'),'front':number+'.png','types':[v.title() for v in e.get('types',[])]}
            if e.get('stage'):record['stage']={'BASIC':'Basic','STAGE1':'Stage1','STAGE2':'Stage2'}.get(e['stage'],e['stage'])
            if e.get('stage_text','').startswith('Evolves from '):record['evolveFrom']=e['stage_text'][13:]
            if e['name'].endswith(' ex'):record['suffix']='ex'
            if e['card_type']=='ENERGY':record['energyType']=e.get('subtype','').title()
            if e['card_type']=='TRAINER':record['trainerType']=e.get('subtype','').title()
            if n==207:record['name']='Basic Psychic Energy'
            cards[n]=record
    assert len(cards)==207 and len(seen)==360
    def preserve(item):
        u,path=item
        if not path.exists():path.write_bytes(fetch(u))
        with Image.open(path) as im:size,mode=list(im.size),im.mode
        return u,{'file':path.relative_to(ROOT).as_posix(),'dimensions':size,'mode':mode,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    saved={}
    with ThreadPoolExecutor(max_workers=8) as pool:
        for i,f in enumerate(as_completed([pool.submit(preserve,x) for x in assets.items()]),1):
            u,data=f.result();saved[u]=data
            if i%25==0:print(f'Preserved {i}/{len(assets)}',flush=True)
    for p in printings:
        p['sources']={kind:{'url':u,**saved[u]} for kind,u in p.pop('images').items()};p['alignmentReview']='pending'
        if p['suffix']=='std':
            target=ASSETS/(p['number']+'.png');content=(ROOT/p['sources']['front']['file']).read_bytes()
            if not target.exists():target.write_bytes(content)
    catalog=[{**cards[n],'variants':[p['variant'] for p in printings if int(p['number'])==n],'foil':{p['variant']:p['foil']['type'] for p in printings if int(p['number'])==n and p['foil']}} for n in sorted(cards)]
    (DEST/'sources.json').write_text(json.dumps({'exportUrl':url,'printings':printings},indent=2)+'\n')
    (ASSETS/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
    (ROOT/'src/pokemon/data/151.generated.ts').write_text('// Exact English TCGL 151 catalog; generated offline.\nexport const pokemon151Records = '+json.dumps(catalog,indent=2)+' as const;\n')
    print(f'Complete: {len(printings)} printings, {len(assets)} raw assets',flush=True)
if __name__=='__main__':main()
