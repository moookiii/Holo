"""Finish deferred Cosmos printings using reviewed, exact-print physical references.

Acquisition and detection only produce proposals. Explicit per-card corrections
are required to publish. Existing masters, plates and optics remain untouched.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import argparse, hashlib, html, json, re, sys
sys.dont_write_bytecode = True
import author_missing as cosmos
import cv2
import numpy as np
import requests
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'scripts/cosmos/pending'
REF = ROOT / 'research/cosmos-pending'
REVIEW = ROOT / 'artifacts/cosmos-pending/registration'
OUT = ROOT / 'public/cards/pokemon/cosmos-completed'
COORDS = (600, 825)

def read(p): return json.loads(p.read_text(encoding='utf8'))
def write(p, v): cosmos.write(p, v)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def normalize(v): return re.sub(r'[^a-z0-9]', '', html.unescape(v).lower())
def registered(raw, size):
    w, h = raw.size
    return raw.resize(size, Image.Resampling.BILINEAR, box=(145/1024*w,0,878/1024*w,h))

def inventory():
    result = []
    for era in ['xy', 'bw']:
        p = ROOT / f'src/pokemon/data/{era}-tcgl.generated.ts'
        sets, surfaces = [json.loads(json.loads(l.split('JSON.parse(',1)[1].removesuffix(');')))
                          for l in p.read_text(encoding='utf8').splitlines() if 'JSON.parse(' in l]
        cards = {c['id']: dict(c,setName=s['name']) for s in sets for c in s['cards']}
        for s in surfaces:
            if s['foilType'] != 'Cosmos' or s['profile'] != 'print-only': continue
            c = cards[s['cardId']]
            master = 'public/cards/pokemon/tcgl-' + era + '/' + c['variantFronts'][s['variant']]
            original = 'public' + s['originalAssets']['foil']
            result.append(dict(era=era,cardId=s['cardId'],variant=s['variant'],name=c['name'],number=c['collectorNumber'],
                set=c['setName'],tcglCardId=s['tcglCardId'],tcglVariantId=s['tcglVariantId'],
                master=master,originalFoil=original,sourceEvidence='public'+s['evidence'],
                preservedHashes=dict(master=sha(ROOT/master),originalFoil=sha(ROOT/original))))
    return result

def sources():
    entries = [e for p in (ROOT/'research/cosmos-missing').glob('pokumon-cosmos-*.json') for e in read(p)]
    def process(c):
        def match(e):
            title = html.unescape(e['title']['rendered'])
            if normalize(c['name']) not in normalize(title): return False
            n=c['number']
            if n.startswith(('XY','BW')):
                return bool(re.search(r'\b'+n[:2]+r'0*'+str(int(n[2:]))+r'\b',title,re.I))
            return bool(re.search(r'\b'+re.escape(n)+r'\b',title))
        matches=[e for e in entries if match(e)]
        cache=REF/('catalog-'+c['cardId']+'.json')
        if not matches:
            if not cache.exists():
                r=requests.get('https://pokumon.com/wp-json/wp/v2/card',params=dict(search=c['number'] if c['number'].startswith(('XY','BW')) else c['name'],language=1260,per_page=100,_embed='wp:featuredmedia'),timeout=40)
                r.raise_for_status();write(cache,r.json())
            matches=[e for e in read(cache) if match(e) and 'cracked ice' not in e['title']['rendered'].lower()]
        candidates=[]
        for e in matches:
            media=e.get('_embedded',{}).get('wp:featuredmedia',[{}])[0]
            if not media.get('source_url'): continue
            url=media['source_url'];target=REF/c['cardId']/(str(e['id'])+Path(url).suffix)
            target.parent.mkdir(parents=True,exist_ok=True)
            if not target.exists():
                r=requests.get(url,timeout=40);r.raise_for_status();target.write_bytes(r.content)
            candidates.append(dict(postId=e['id'],title=html.unescape(e['title']['rendered']),pageUrl=e['link'],imageUrl=url,
                file=target.relative_to(ROOT).as_posix(),sha256=sha(target),dimensions=list(Image.open(target).size),
                description=html.unescape(re.sub('<[^>]+>','',e.get('content',{}).get('rendered','')))))
        print(c['cardId'],len(candidates),'references',flush=True)
        return dict(c,candidates=candidates)
    with ThreadPoolExecutor(5) as pool: results=list(pool.map(process,inventory()))
    write(DATA/'sources.json',results)

def reviews(c, photo, motifs, label):
    folder=REVIEW/c['cardId'];folder.mkdir(parents=True,exist_ok=True)
    mask=cosmos.rasterize(motifs);mask.save(folder/(label+'-motifs.png'))
    overlay=Image.fromarray(photo).resize((1200,1650));draw=ImageDraw.Draw(overlay)
    for d in motifs:
        if 'center' in d:
            x,y=d['center'];rx,ry=d.get('radii',[d['radius'],d['radius']])
            draw.ellipse(((x-rx)*2,(y-ry)*2,(x+rx)*2,(y+ry)*2),outline='#ff00b0',width=2)
            draw.text((x*2+3,y*2+3),str(d.get('id','+')),fill='white',stroke_width=1,stroke_fill='black')
        elif 'outline' in d:draw.line([(x*2,y*2) for x,y in d['outline']+d['outline'][:1]],fill='#ff00b0',width=2)
    overlay.save(folder/(label+'-full.png'))
    pair=Image.new('RGB',(2160,760),'#111820')
    pair.paste(Image.fromarray(photo).resize((1200,1650)).crop((60,140,1140,870)),(0,30))
    pair.paste(overlay.crop((60,140,1140,870)),(1080,30))
    ImageDraw.Draw(pair).text((8,5),c['cardId']+' '+c['name']+' physical reference / boundaries',fill='white')
    pair.save(folder/(label+'-compare.png'))

def proposals(ids=None):
    saved=DATA/'proposals.json'
    records={c['cardId']:c for c in read(saved)} if saved.exists() else {}
    def process(c):
        choices=[]
        for candidate in c['candidates']:
            aligned=cosmos.register(c,candidate)
            if aligned:choices.append((aligned[1]['inliers'],candidate,aligned))
        if not choices:
            print(c['cardId'],'NO ALIGNED REFERENCE',flush=True);return None
        _,selected,(photo,transform)=max(choices,key=lambda a:a[0])
        path=REF/c['cardId']/'registered.png';Image.fromarray(photo).save(path)
        plate=np.asarray(registered(Image.open(ROOT/c['originalFoil']).convert('L'),COORDS))
        master=np.asarray(Image.open(ROOT/c['master']).convert('RGB').resize(COORDS))
        motifs=cosmos.propose(photo,master,plate>30)
        reviews(c,photo,motifs,'proposal')
        print(c['cardId'],len(motifs),'proposals',flush=True)
        return dict(c,source=selected,registration=transform,coordinateDimensions=list(COORDS),
            registeredReference=path.relative_to(ROOT).as_posix(),motifs=motifs,reviewStatus='candidate-only')
    with ThreadPoolExecutor(4) as pool:
        for c in pool.map(process,[c for c in read(DATA/'sources.json') if not ids or c['cardId'] in ids]):
            if c:records[c['cardId']]=c;write(saved,list(records.values()))

def publish():
    corrections=read(DATA/'corrections.json');records=[];surfaces=[]
    for c in read(DATA/'proposals.json'):
        correction=corrections.get(c['cardId'])
        if not correction or not correction.get('reviewed'):continue
        assert correction['sourceAlignmentReviewed']
        for k,h in c['preservedHashes'].items():assert sha(ROOT/c[k])==h
        motifs=cosmos.corrected(c,correction);assert motifs
        folder=OUT/c['tcglCardId'];folder.mkdir(parents=True,exist_ok=True)
        cosmos.rasterize(motifs).save(folder/'cosmos.png',optimize=True)
        plate=registered(Image.open(ROOT/c['originalFoil']),(733,1024))
        plate.save(folder/'foil-controls.png',optimize=True);plate.convert('L').save(folder/'foil.png',optimize=True)
        # The native TCGL whiteplate includes opaque print protection. A second
        # subject threshold would attenuate it twice. Keep composition separate.
        Image.new('L',(733,1024),0).save(folder/'protection.png',optimize=True)
        base='/cards/pokemon/cosmos-completed/'+c['tcglCardId']+'/'
        maps={k:base+v for k,v in dict(foil='foil.png',foilControls='foil-controls.png',motif='cosmos.png',protection='protection.png').items()}
        record=dict(c,motifs=motifs,reviewStatus='reviewed-visible-features',reviewNotes=correction['notes'],
            maps=maps,outputDimensions=[1200,1650],profile='pokemon-base-set-2-cosmos',
            outputHashes={k:sha(ROOT/('public'+v)) for k,v in maps.items()},
            limitations='Visible features from selected reference copy; other copies have different placements. Unresolved faint features omitted. Flat references do not calibrate angular response or physical depth.')
        write(folder/'evidence.json',record);records.append(record)
        surfaces.append(dict(cardId=c['cardId'],variant=c['variant'],tcglVariantId=c['tcglVariantId'],maps=maps,evidence=base+'evidence.json'))
        reviews(c,np.asarray(Image.open(ROOT/c['registeredReference']).convert('RGB')),motifs,'final')
    write(DATA/'registration.json',records)
    target=ROOT/'src/pokemon/data/completed-cosmos.generated.ts'
    target.write_text('// Reviewed physical-copy placements. Generated by scripts/cosmos/complete_pending.py.\nexport const completedCosmos = '+json.dumps(surfaces,indent=2)+' as const;\n',encoding='utf8')
    print(len(records),'reviewed finishes published',flush=True)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('action',choices=['sources','propose','publish']);ap.add_argument('--ids',nargs='+');a=ap.parse_args()
    DATA.mkdir(parents=True,exist_ok=True);REF.mkdir(parents=True,exist_ok=True)
    if a.action=='sources':sources()
    elif a.action=='propose':proposals(a.ids)
    else:publish()
