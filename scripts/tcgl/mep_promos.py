"""Preserve exact MEP printings, then convert only visually reviewed sources.

Usage: python scripts/tcgl/mep_promos.py acquire|convert
Review records must be written after inspecting each paired source image.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import sys, json, shutil
import numpy as np
from PIL import Image, ImageDraw
from fetch_sv_sets import fetch, BASE
from mega_series import preserve
from convert_sv_sets import black_floor
import convert_151_set as converter

ROOT = converter.ROOT
ARCHIVE = ROOT/'research/tcgl/mep-set'
ASSETS = ROOT/'public/cards/pokemon/tcgl-me/mep'
REVIEW = ROOT/'artifacts/mep/source-review'

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=True)+'\n', encoding='utf-8')

def acquire():
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    index=json.loads(fetch(BASE+'index.json'))['en-US']
    url=BASE+index['mebsp']['path']; payload=fetch(url)
    (ARCHIVE/'export.json').write_bytes(payload)
    entries=json.loads(payload)
    meta=json.loads(fetch('https://api.tcgdex.net/v2/en/sets/mep'))
    write(ARCHIVE/'tcgdex-set.json',meta)
    export={'url':url,'sha256':converter.digest(ARCHIVE/'export.json'),'file':'research/tcgl/mep-set/export.json'}
    jobs={}
    for e in entries:
        number=e['collector_number']['numerator']; dest=ROOT/f'research/tcgl/mep-{number}'
        for u in e['images']['tcgl']['png'].values():jobs[u]=dest/u.rsplit('/',1)[1]
    with ThreadPoolExecutor(max_workers=12) as pool:
        saved=dict(zip(jobs,pool.map(lambda job:preserve(*job),jobs.items())))
    records=[];printings=[]
    for e in entries:
        tcgl=e['ext']['tcgl']; number=e['collector_number']['numerator']
        if tcgl['longFormID'].split('_')[3]!='std':raise ValueError('Unmapped printing')
        sources={k:saved[u] for k,u in e['images']['tcgl']['png'].items()}
        shutil.copyfile(ROOT/sources['front']['file'],ASSETS/(number+'.png'))
        p={'cardId':'mep-'+number,'number':number,'frontFile':number+'.png','variant':'holo',
           'name':e['name'],'rarity':'Promo','tcglCardId':tcgl['cardID'],'tcglVariantId':tcgl['longFormID'],
           'foil':e['foil'],'sources':sources,'exportEntry':e,'exportSource':export}
        write(ROOT/f'research/tcgl/mep-{number}/source.json',p)
        printings.append(p)
        record={'id':p['cardId'],'localId':number,'name':e['name'],'rarity':'Promo','category':e['card_type'].title(),
                'collectorNumber':number,'front':number+'.png','variants':['holo'],'foil':{'holo':e['foil']['type']},
                'types':[t.title() for t in e.get('types',[])]}
        if e.get('stage'):record['stage']={'BASIC':'Basic','STAGE1':'Stage1','STAGE2':'Stage2'}.get(e['stage'],e['stage'])
        if e.get('stage_text','').startswith('Evolves from '):record['evolveFrom']=e['stage_text'][13:]
        if e['name'].endswith(' ex'):record['suffix']='ex'
        if e.get('subtype'):record['trainerType']=e['subtype'].title()
        records.append(record)
        # Paired full-UV sources and line overlay, with unchanged clean front.
        front=Image.open(ROOT/sources['front']['file']).convert('RGB')
        panels=[('clean / paired TCGL front',front)]
        if 'etch' in sources:
            raw=Image.open(ROOT/sources['etch']['file']).convert('RGBA')
            line=np.asarray(raw,np.float32)[...,:3].mean(2)/255
            overlay=np.asarray(front,np.float32)*(1-line[...,None]*.5)+np.array([0,255,150])*line[...,None]*.5
            panels += [('raw exact etch',raw.convert('RGB')),('etch registration',Image.fromarray(np.clip(overlay,0,255).astype(np.uint8)))]
        panels.append(('raw foil coverage',Image.open(ROOT/sources['foil']['file']).convert('RGB')))
        sheet=Image.new('RGB',(733*len(panels),1052),'#222');draw=ImageDraw.Draw(sheet)
        for i,(label,img) in enumerate(panels):sheet.paste(img,(733*i,28));draw.text((733*i+8,8),number+' '+label,fill='white')
        sheet.save(REVIEW/(number+'.png'))
    write(ARCHIVE/'sources.json',{'exportSource':export,'printings':printings})
    write(ASSETS/'catalog.json',records)
    print(f'Preserved {len(records)} cards, {len(jobs)} exact assets, {sum("etch" in p["sources"] for p in printings)} etches.',flush=True)

def convert():
    source=json.loads((ARCHIVE/'sources.json').read_text())
    reviews=json.loads((REVIEW/'review.json').read_text())
    converter.ASSETS=ASSETS;converter.OUT=ASSETS/'tcgl';converter.OUT.mkdir(exist_ok=True)
    converter.PUBLIC_BASE='/cards/pokemon/tcgl-me/mep';converter.PROFILE_PREFIX='sv_tcgl_'
    converter.FOIL_NATIVE=True;converter.OMIT_HEIGHT=True;converter.BODY_EVIDENCE=True
    surfaces=[]
    for p in source['printings']:
        number=p['number']; review=reviews[number]
        if not review['inspected']:raise ValueError('Review missing: '+number)
        p['alignmentReview']={**review,'status':'reviewed','verticalFlip':False,'cropOrOffset':False,
             'holoFrontSha256':converter.digest(ASSETS/(number+'.png'))}
        p['foilBlackFloor'],p['foilBlackFloorRgb']=black_floor(p['sources']['foil'])
        p['treatment']='sir_texture' if 'etch' in p['sources'] else 'illustration_holo' if p['foil']['type']=='SUN_PILLAR' else 'regular_holo'
        result=converter.convert(p,False)
        result['profile']='prismatic_sir_texture' if result['textured'] else result['profile']
        result['tcglVariantId']=p['tcglVariantId']
        evidence_path=ROOT/'public'/result['evidence'].lstrip('/')
        evidence=json.loads(evidence_path.read_text());evidence['exportEntry']=p['exportEntry'];evidence['exportSource']=p['exportSource']
        evidence['physicalFinishReview']='Pending exact-print angled-photo calibration; TCGL geometry is not measured depth.'
        if p['foil']['type']=='COSMOS':
            result['profile']='svp-cosmos'
            evidence['profile']='svp-cosmos'
            evidence['cosmosPlacement']={'status':'shared-sheet','profile':'svp-cosmos','reason':'User approved the existing shared Cosmos treatment for unfinished promo printings. Exact per-card foil/protection remains active; positions are not a physical-copy match.'}
            evidence['finishStatus']='Shared Cosmos treatment active; exact TCGL front and coverage preserved.'
        if p['foil']['type']=='STAMPED':
            result['treatmentStatus']='deferred'
            result['profile']='print-only'
            evidence['finishStatus']='Original front only; Cosmos placements or stamped optics pending exact-print evidence.'
        write(evidence_path,evidence);surfaces.append(result)
        print('Converted '+number,flush=True)
    write(ASSETS/'tcgl/manifest.json',surfaces)
    write(ARCHIVE/'sources.json',source)
    records=json.loads((ASSETS/'catalog.json').read_text())
    sets=[{'id':'mep','name':'MEP Black Star Promos','releaseDate':'2025-09-26','seriesId':'me','seriesName':'Mega Evolution',
           'logo':None,'assets':'/cards/pokemon/tcgl-me/mep','cards':records}]
    text='// Exact MEP TCGL printings; generated offline by scripts/tcgl/mep_promos.py.\nimport type { TcglSvSetRecord } from "./sv-tcgl.generated.ts";\nimport type { TcglSvSurface } from "./sv-tcgl-surfaces.generated.ts";\n'
    text+='export const tcglMepSets: readonly (TcglSvSetRecord & { seriesId: string; seriesName: string })[] = '+json.dumps(sets,indent=2)+';\n'
    text+='export const tcglMepSurfaces: readonly (TcglSvSurface & { tcglVariantId: string; treatmentStatus?: string })[] = '+json.dumps(surfaces,indent=2)+';\n'
    (ROOT/'src/pokemon/data/mep-tcgl.generated.ts').write_text(text,encoding='utf-8')

if __name__=='__main__':
    {'acquire':acquire,'convert':convert}[sys.argv[1]]()
