"""BW physical Cosmos registration and exact gold TCGL source preparation.

Proposals never activate optics. Review corrections and PNG rasterization are
separate, stable inputs. Shared Cosmos shaders and other series are read-only.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse
import html
import json
import re
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'cosmos'))
import author_missing as cosmos
import cv2
import numpy as np
import requests
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'scripts/tcgl/bw-cosmos'
REF = ROOT / 'research/tcgl/bw-cosmos'
REVIEW = ROOT / 'artifacts/bw-finishes/cosmos'
OUT = ROOT / 'public/cards/pokemon/tcgl-bw'
COORDS = cosmos.COORDS
cv2.setNumThreads(1)

def read(p): return json.loads(p.read_text(encoding='utf8'))
def write(p, value): cosmos.write(p, value)
def exports():
    p = ROOT / 'src/pokemon/data/bw-tcgl.generated.ts'
    return [json.loads(json.loads(l.split('JSON.parse(', 1)[1].removesuffix(');')))
            for l in p.read_text(encoding='utf8').splitlines() if 'JSON.parse(' in l]

def inventory():
    sets, surfaces = exports()
    cards = {c['id']: c for s in sets for c in s['cards']}
    result = []
    for s in surfaces:
        if s['foilType'] != 'Cosmos': continue
        c = cards[s['cardId']]
        e = read(ROOT / ('public' + s['evidence']))
        result.append(dict(cardId=s['cardId'], tcglCardId=s['tcglCardId'], name=c['name'],
            number=c['collectorNumber'], tcglVariantId=s['tcglVariantId'], variant=s['variant'],
            master='public/cards/pokemon/tcgl-bw/' + c['variantFronts'][s['variant']],
            evidence='public' + s['evidence'], destination='public/cards/pokemon/tcgl-bw/' + s['tcglCardId'] + '/cosmos.png',
            printing=e['printing']))
    assert len(result) == 48
    return result

def sources():
    # Catalog identifies the exact English Cosmos printing; image selection is
    # still checked against the exact clean master during projective alignment.
    entries = [e for p in (ROOT/'research/cosmos-missing').glob('pokumon-cosmos-*.json') for e in read(p)]
    assert entries, 'Acquire the English Cosmos Pokumon catalog first'
    def process(c):
        number = c['number'].split('/')[0]
        candidates = []
        matches = entries
        # Some early EX promos and special prints are absent from the catalog's
        # Cosmos taxonomy. Search the exact printed number and inspect the source.
        cache=REF/('catalog-'+c['cardId']+'.json')
        if not cache.exists():
            query=number if number.startswith('BW') else c['name']
            r=requests.get('https://pokumon.com/wp-json/wp/v2/card',params=dict(search=query,
                language=1260,per_page=100,_embed='wp:featuredmedia'),timeout=50)
            r.raise_for_status();write(cache,r.json())
        matches=entries+read(cache)
        seen=set()
        for e in matches:
            if e['id'] in seen: continue
            seen.add(e['id'])
            title = html.unescape(e['title']['rendered'])
            normalize=lambda v: re.sub(r'[^a-z0-9]','',v.lower())
            if normalize(c['name']) not in normalize(title): continue
            if number.startswith('BW'):
                match = re.search(r'\bBW0*' + str(int(number[2:])) + r'\b', title, re.I)
            else:
                match = re.search(r'\b' + re.escape(c['number']) + r'\b', title)
            media = e.get('_embedded', {}).get('wp:featuredmedia', [{}])[0]
            if not match or not media.get('source_url'): continue
            url = media['source_url']; target = REF/c['cardId']/(str(e['id'])+Path(url).suffix)
            target.parent.mkdir(parents=True,exist_ok=True)
            if not target.exists():
                r=requests.get(url,timeout=40);r.raise_for_status();target.write_bytes(r.content)
            candidates.append(dict(postId=e['id'],title=title,pageUrl=e['link'],imageUrl=url,
                file=target.relative_to(ROOT).as_posix(),sha256=cosmos.sha(target),dimensions=list(Image.open(target).size)))
        print(c['cardId'],len(candidates),'references',flush=True)
        return dict(c,candidates=candidates)
    with ThreadPoolExecutor(5) as pool: result=list(pool.map(process,inventory()))
    write(DATA/'sources.json',result)

def reviews(c, photo, motifs, label):
    # Full-card overlay and whole foil window, never only a contact-sheet review.
    folder=REVIEW/c['cardId'];folder.mkdir(parents=True,exist_ok=True)
    mask=cosmos.rasterize(motifs)
    overlay=Image.fromarray(photo).resize((1200,1650));draw=ImageDraw.Draw(overlay)
    for d in motifs:
        if 'center' in d:
            x,y=d['center'];rx,ry=d.get('radii',[d['radius'],d['radius']])
            draw.ellipse(((x-rx)*2,(y-ry)*2,(x+rx)*2,(y+ry)*2),outline='#ff00b0',width=2)
            draw.text((x*2+3,y*2+3),str(d.get('id','+')),fill='white',stroke_width=1,stroke_fill='black')
        elif 'outline' in d:
            points=[(x*2,y*2) for x,y in d['outline']]
            draw.line(points+[points[0]],fill='#ff00b0',width=2)
        elif 'points' in d: draw.line([(x*2,y*2) for x,y in d['points']],fill='#ff00b0',width=2)
    overlay.save(folder/(label+'-full.png'));mask.save(folder/(label+'-motifs.png'))
    pair=Image.new('RGB',(2160,760),'#111820')
    pair.paste(Image.fromarray(photo).resize((1200,1650)).crop((60,140,1140,870)),(0,30))
    pair.paste(overlay.crop((60,140,1140,870)),(1080,30))
    ImageDraw.Draw(pair).text((8,5),c['cardId']+' '+c['name']+' physical reference / boundaries',fill='white')
    pair.save(folder/(label+'-compare.png'))

def proposals(ids=None):
    saved=DATA/'proposals.json'
    result=[c for c in read(saved) if ids and c['cardId'] not in ids] if saved.exists() else []
    extras=read(DATA/'extra-references.json') if (DATA/'extra-references.json').exists() else {}
    for c in read(DATA/'sources.json'):
        if ids and c['cardId'] not in ids: continue
        choices=[]
        for candidate in ([extras[c['cardId']]] if c['cardId'] in extras else c['candidates']):
            aligned=cosmos.register(c,candidate)
            if aligned: choices.append((aligned[1]['inliers'],candidate,aligned))
        if not choices:
            print(c['cardId'],'NO ALIGNED PHYSICAL SOURCE',flush=True);continue
        _,selected,(photo,transform)=max(choices,key=lambda x:x[0])
        target=REF/c['cardId']/'registered.png';Image.fromarray(photo).save(target)
        e=read(ROOT/c['evidence'])
        from prepare_swsh_proofs import registered
        foil=registered(Image.open(ROOT/('public'+e['sources']['foil']['publicOriginal'])).convert('RGB'),COORDS)
        gray=np.asarray(foil.convert('L'))
        allowed=gray>30
        master=np.asarray(Image.open(ROOT/c['master']).convert('RGB').resize(COORDS))
        motifs=cosmos.propose(photo,master,allowed)
        reviews(c,photo,motifs,'proposal')
        record=dict(c,source=selected,registration=transform,coordinateDimensions=list(COORDS),
            registeredReference=target.relative_to(ROOT).as_posix(),motifs=motifs,reviewStatus='candidate-only',
            preservedHashes={'master':cosmos.sha(ROOT/c['master']), 'originalFoil':cosmos.sha(ROOT/('public'+e['sources']['foil']['publicOriginal']))})
        result.append(record);write(saved,result); print(c['cardId'],len(motifs),'proposals',flush=True)
    write(DATA/'proposals.json',result)

def publish(publish=True):
    corrections=read(DATA/'corrections.json');records=[]
    for c in read(DATA/'proposals.json'):
        correction=corrections.get(c['cardId'])
        if not correction or publish and not correction.get('reviewed'): continue
        assert correction['sourceAlignmentReviewed']
        motifs=cosmos.corrected(c,correction)
        assert motifs,c['cardId']
        assert cosmos.sha(ROOT/c['master'])==c['preservedHashes']['master']
        target=ROOT/c['destination']
        reviews(c,np.asarray(Image.open(ROOT/c['registeredReference']).convert('RGB')),motifs,'final' if publish else 'draft')
        if not publish: continue
        cosmos.rasterize(motifs).save(target,optimize=True)
        record=dict(c,motifs=motifs,reviewStatus='reviewed-visible-features',outputDimensions=[1200,1650],
            motifSha256=cosmos.sha(target),reviewNotes=correction['notes'],
            limitations='Registered visible features of selected physical copy. Faint subpixel features remain unresolved; other copies have different sheet placement. Scan does not measure optical depth.')
        records.append(record)
    if publish: write(DATA/'registration.json',records)
    print(len(records),'reviewed registrations' if publish else 'draft only; no active changes')

def activate():
    """Update reviewed BW records only; never regenerate the shared catalog."""
    from prepare_swsh_proofs import registered
    registry=read(DATA/'registration.json')
    by_id={c['tcglCardId']:c for c in registry}
    generated=ROOT/'src/pokemon/data/bw-tcgl.generated.ts'
    lines=generated.read_text(encoding='utf8').splitlines()
    for i,line in enumerate(lines):
        if 'tcglBwSurfaces' not in line or 'JSON.parse(' not in line: continue
        surfaces=json.loads(json.loads(line.split('JSON.parse(',1)[1].removesuffix(');')))
        for s in surfaces:
            c=by_id.get(s['tcglCardId'])
            if not c: continue
            folder=OUT/s['tcglCardId'];e=read(folder/'evidence.json')
            assert s['tcglVariantId']==c['tcglVariantId']
            assert c['reviewStatus']=='reviewed-visible-features'
            assert cosmos.sha(ROOT/c['master'])==c['preservedHashes']['master']
            plate=registered(Image.open(folder/'original-foil.png'),(733,1024))
            plate.save(folder/'foil-controls.png')
            # The TCGL plate already combines the foil window and opaque print.
            # Retain it exactly as coverage; a separate zero protection map
            # avoids multiplying its continuous subject attenuation twice.
            plate.convert('L').save(folder/'foil.png')
            Image.new('L',(733,1024),0).save(folder/'protection.png')
            base='/cards/pokemon/tcgl-bw/'+s['tcglCardId']+'/'
            maps={k:base+v for k,v in dict(foil='foil.png',foilControls='foil-controls.png',
                motif='cosmos.png',protection='protection.png').items()}
            s.update(profile='pokemon-base-set-2-cosmos',maps=maps,textured=False,
                treatmentStatus='existing-material',deferredEffect=None)
            e.update(profile=s['profile'],maps=maps,treatmentStatus=s['treatmentStatus'],deferredEffect=None)
            e['cosmosPlacement']=dict(status=c['reviewStatus'],active=True,
                registration='scripts/tcgl/bw-cosmos/registration.json',reference=c['source'],
                coordinateDimensions=c['coordinateDimensions'],outputDimensions=[1200,1650],
                sha256=c['motifSha256'],transform=c['registration'],reviewNotes=c['reviewNotes'],
                limitations=c['limitations'])
            e['limitations']='Visible physical-copy features registered; unresolved faint features omitted. Exact TCGL whiteplate retains original foil/opaque-print boundaries.'
            e['outputHashes']={k:cosmos.sha(ROOT/('public'+v)) for k,v in maps.items()}
            write(folder/'evidence.json',e)
        lines[i]=line.split('JSON.parse(',1)[0]+'JSON.parse('+json.dumps(json.dumps(surfaces,ensure_ascii=False),ensure_ascii=False)+');'
    generated.write_text('\n'.join(lines)+'\n',encoding='utf8')
    pending=ROOT/'docs/bw-pending-finishes.json';families=read(pending)
    family='Cosmos registered motif placement'
    families[family]=[c for c in families.get(family,[]) if c['tcglCardId'] not in by_id]
    if not families[family]: families.pop(family)
    write(pending,families)
    print(len(registry),'reviewed Cosmos variants activated')

def gold():
    """The exact English line fields reconstruct the otherwise flat gold fronts.

    Own whiteplate modulates the subject. Only the printed black/type glyphs
    are protected; no printed brightness contributes to the height field.
    """
    from prepare_swsh_proofs import registered
    size=(1800,2475)
    for cid in ('bw11_114','bw11_115'):
        folder=OUT/cid;e=read(folder/'evidence.json')
        src=np.asarray(registered(Image.open(folder/'original-etch.png').convert('RGBA'),(733,1024)),np.float32)/255
        height=cv2.resize(1-src[:,:,:3].mean(2),size,interpolation=cv2.INTER_LINEAR)
        alpha=cv2.resize(src[:,:,3],size,interpolation=cv2.INTER_LINEAR)
        front=np.asarray(registered(Image.open(folder/'original-front.png').convert('RGB'),size),np.float32)/255
        # The gold TCGL front contains only uniform gold, header shading and
        # opaque printed glyphs; the Pokemon is exclusively in its etch/plate.
        dark=np.clip((.38-front.max(2))/.22,0,1)
        colored=np.maximum(np.clip((front[:,:,2]-.16)/.15,0,1),
            np.clip((.40-front[:,:,1]/np.maximum(front[:,:,0],.01))/.18,0,1))
        protection=np.rint(np.maximum(dark,colored)*255).astype(np.uint8)
        p=protection.astype(np.float32)/255
        plate=np.asarray(registered(Image.open(folder/'original-foil.png').convert('RGB'),size),np.float32).mean(2)/255
        body=np.clip((1-plate)/.18,0,1)*(1-p)
        body8=np.rint(body*255).astype(np.uint8);body=body8.astype(np.float32)/255
        roughness=.30+.105*body
        dx=cv2.Scharr(height,cv2.CV_32F,1,0,scale=1/32)
        dr=cv2.Scharr(height,cv2.CV_32F,0,1,scale=1/32)
        n=np.stack((-dx*1.03*(1-p),dr*1.03*(1-p),np.ones_like(dx)),2)
        n/=np.linalg.norm(n,axis=2)[:,:,None]
        n=n*alpha[:,:,None]+np.array([0,0,1],np.float32)*(1-alpha[:,:,None])
        images={'normal':np.rint(np.clip(n*.5+.5,0,1)*255).astype(np.uint8),
            'protection':protection,'body':body8,'roughness':np.rint(roughness*255).astype(np.uint8)}
        for k,v in images.items(): Image.fromarray(v).save(folder/(k+'.png'))
        # Retain exact intensity/subject information independently of relief.
        registered(Image.open(folder/'original-foil.png'),(733,1024)).save(folder/'foil-controls.png')
        registered(Image.open(folder/'original-foil.png').convert('L'),(733,1024)).save(folder/'foil.png')
        evidence=dict(conversionSchema='holo-bw-gold-normal-v1',tcglCardId=cid,tcglVariantId=e['tcglVariantId'],
            source=e['sources']['etch']['publicOriginal'],sourceUrl=e['sources']['etch']['bundle_source']['url'],
            pairedFront=e['sources']['front']['publicOriginal'],sourceDimensions=[1024,1024],outputDimensions=list(size),
            sourceSha256=cosmos.sha(folder/'original-etch.png'),frontSha256=cosmos.sha(folder/'original-front.png'),
            foilSha256=cosmos.sha(folder/'original-foil.png'),
            **{k+'Sha256':cosmos.sha(folder/(k+'.png')) for k in images},
            uvBox=[145/1024,0,878/1024,1],verticalFlip=False,polarity='inverted luminance; white strokes recess',
            registrationReview='Own English front, etch and whiteplate inspected at full-card UV. Title, type symbols, wing/body outlines, attack text and border align; native Unity bleed removed consistently.',
            operations='Mean RGB, invert, bilinear 1800x2475 height/alpha; Scharr CV_32F scale 1/32; (-dx,+drow,+1) gain 1.03; protection after differentiation; normalize; alpha flat blend; rounded opaque RGB PNG.',
            protection='Individual dark/colored printed glyphs across the otherwise uniform gold front; no rectangular row selections or artwork-derived height.',
            body='Own TCGL whiteplate continuous subject attenuation, normalized over its 18 percent modulation; no front brightness roughness.',
            secondaryRegion='No separately verified microdiamond region; zero coverage',embossStrength=0,runtimeGeneration=False,
            physicalReference='User supplied Japanese EX Battle Boost #94/#95 photo. Finish comparison only; English geometry and print remain exact TCGL.',
            limitations='Polarity follows registered white-stroke recess convention; photos cannot measure physical groove depth. Japanese and English stock differ; exact English angular calibration remains approximate.')
        write(folder/'normal-evidence.json',evidence)
        print(cid,'exact normal',flush=True)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('action',choices=['sources','propose','draft','publish','activate','gold']);ap.add_argument('--ids',nargs='+');a=ap.parse_args()
    if a.action=='propose': proposals(a.ids)
    elif a.action=='draft': publish(False)
    else: {'sources':sources,'publish':publish,'activate':activate,'gold':gold}[a.action]()
