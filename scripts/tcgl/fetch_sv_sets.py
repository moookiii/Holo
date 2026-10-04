"""Preserve exact English TCGL printings for the ten requested retail sets."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse
import hashlib, json, os
from PIL import Image
from fetch_prismatic_set import fetch

ROOT=Path(__file__).resolve().parents[2]
BASE='https://cdn.malie.io/file/malie-io/tcgl/export/'
ENERGIES={'G':'Grass','R':'Fire','W':'Water','L':'Lightning','P':'Psychic','F':'Fighting','D':'Darkness','M':'Metal'}

def write_catalog(sets):
    text='// Exact English TCGL catalogs; generated offline.\nimport type { PokemonCard } from "../types.ts";\nexport interface TcglSvCardRecord extends Omit<PokemonCard, "setId" | "setName" | "seriesId" | "seriesName" | "era"> { collectorNumber: string; }\nexport interface TcglSvSetRecord { id: string; name: string; releaseDate: string; logo: string | null; assets: string; cards: TcglSvCardRecord[]; }\nexport const tcglSvSets: readonly TcglSvSetRecord[] = '+json.dumps(sets,indent=2)+';\n'
    (ROOT/'src/pokemon/data/sv-tcgl.generated.ts').write_text(text,encoding='utf-8')

def main():
    index=json.loads(fetch(BASE+'index.json'))['en-US'];sets=[]
    for i in range(1,11):
        set_id=f'sv{i:02d}';key=f'sv{i}'
        dest=ROOT/f'research/tcgl/{set_id}-set';assets=ROOT/f'public/cards/pokemon/tcgl-sv/{set_id}'
        (dest/'raw').mkdir(parents=True,exist_ok=True);assets.mkdir(parents=True,exist_ok=True)
        url=BASE+index[key]['path'];payload=fetch(url);entries=json.loads(payload)
        (dest/'export.json').write_bytes(payload)
        (dest/'export-source.json').write_text(json.dumps({'url':url,'sha256':hashlib.sha256(payload).hexdigest()},indent=2)+'\n')
        meta=json.loads(fetch('https://api.tcgdex.net/v2/en/sets/'+set_id))
        downloads={};printings=[];cards={};seen=set()
        for e in entries:
            n=e['collector_number']['numeric'];number=f'{n:03d}';tcgl=e['ext']['tcgl'];suffix=tcgl['longFormID'].split('_')[3]
            if suffix not in ('std','ph'):raise ValueError('Unknown variant '+suffix)
            variant='reverse' if suffix=='ph' else 'holo' if 'foil' in e else 'normal'
            if (n,variant) in seen:raise ValueError('Duplicate printing')
            seen.add((n,variant));rarity=e['rarity']['designation'].replace('_',' ').title()
            printings.append({'cardId':set_id+'-'+number,'number':number,'name':e['name'],'rarity':rarity,'variant':variant,'suffix':suffix,'tcglCardId':tcgl['cardID'],'tcglVariantId':tcgl['longFormID'],'foil':e.get('foil'),'images':e['images']['tcgl']['png']})
            for u in e['images']['tcgl']['png'].values():downloads[u]=dest/'raw'/Path(urlparse(u).path).name
            if suffix=='std':
                name=e['name']
                for token,label in ENERGIES.items():name=name.replace('{'+token+'}',label)
                record={'id':set_id+'-'+number,'localId':number,'name':name,'rarity':rarity,'category':e['card_type'].title(),'front':number+'.png','types':[v.title() for v in e.get('types',[])],'collectorNumber':e['collector_number']['full']}
                if e.get('stage'):record['stage']={'BASIC':'Basic','STAGE1':'Stage1','STAGE2':'Stage2'}.get(e['stage'],e['stage'])
                if e.get('stage_text','').startswith('Evolves from '):record['evolveFrom']=e['stage_text'][13:]
                if e['name'].endswith(' ex'):record['suffix']='ex'
                if e['card_type']=='ENERGY':record['energyType']=e.get('subtype','').title()
                if e['card_type']=='TRAINER':record['trainerType']=e.get('subtype','').title()
                cards[n]=record
        expected={int(c['localId']) for c in meta['cards']}
        if set(cards)!=expected:raise ValueError(f'{set_id}: TCGL/retail card mismatch {set(cards)^expected}')
        def preserve(item):
            u,path=item
            if not path.exists():
                temporary=path.with_suffix('.download');temporary.write_bytes(fetch(u));temporary.replace(path)
            with Image.open(path) as im:size,mode=list(im.size),im.mode
            return u,{'file':path.relative_to(ROOT).as_posix(),'dimensions':size,'mode':mode,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
        saved={}
        with ThreadPoolExecutor(max_workers=8) as pool:
            for count,f in enumerate(as_completed([pool.submit(preserve,x) for x in downloads.items()]),1):
                u,data=f.result();saved[u]=data
                if count%100==0:print(f'{set_id}: preserved {count}/{len(downloads)}',flush=True)
        previous=json.loads((dest/'sources.json').read_text()) if (dest/'sources.json').exists() else {'printings':[]}
        old={p['tcglVariantId']:p for p in previous['printings']}
        for p in printings:
            p['sources']={kind:{'url':u,**saved[u]} for kind,u in p.pop('images').items()};p['alignmentReview']='pending'
            if p['tcglVariantId'] in old and old[p['tcglVariantId']]['sources']==p['sources']:p['alignmentReview']=old[p['tcglVariantId']]['alignmentReview']
            if p['suffix']=='std':
                target=assets/(p['number']+'.png')
                if not target.exists():os.link(ROOT/p['sources']['front']['file'],target)
        catalog=[{**cards[n],'variants':[p['variant'] for p in printings if int(p['number'])==n],'foil':{p['variant']:p['foil']['type'] for p in printings if int(p['number'])==n and p['foil']}} for n in sorted(cards)]
        (dest/'sources.json').write_text(json.dumps({'exportUrl':url,'printings':printings},indent=2)+'\n')
        (assets/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
        sets.append({'id':set_id,'name':meta['name'],'releaseDate':meta['releaseDate'],'logo':meta.get('logo')+'.webp' if meta.get('logo') else None,'assets':f'/cards/pokemon/tcgl-sv/{set_id}','cards':catalog})
        write_catalog(sets)
        print(f'{set_id}: complete {len(cards)} cards, {len(printings)} printings, {len(downloads)} raw sources',flush=True)

if __name__=='__main__':main()
