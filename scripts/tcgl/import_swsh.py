"""Import the completed Unity extraction without changing any optical profiles.

All transforms are offline and content-addressed. Original sources are retained
per printing; variant IDs, channels and provenance survive catalog grouping.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse, hashlib, json, shutil, sys
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
from prepare_swsh_proofs import registered, CASES
from convert_30th_sources import normal_pixels

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/cards/pokemon/tcgl-swsh'
DATES = dict(zip(['swsh1','swsh2','swsh3','swsh3-5','swsh4','swsh4-5','swsh5','swsh6','swsh7','swsh7-5','swsh8','swsh9','swsh10','swsh10-5','swsh11','swsh12','swsh12-5'],
 ['2020-02-07','2020-05-01','2020-08-14','2020-09-25','2020-11-13','2021-02-19','2021-03-19','2021-06-18','2021-08-27','2021-10-08','2021-11-12','2022-02-25','2022-05-27','2022-07-01','2022-09-09','2022-11-11','2023-01-20']))
for subset,parent in [('swsh9a','swsh9'),('swsh10a','swsh10'),('swsh11a','swsh11'),('swsh12a','swsh12'),('swsh12-5a','swsh12-5'),('swsh7-5r','swsh7-5')]: DATES[subset]=DATES[parent]
DATES.update(swshalt='2020-02-07',swshbsp='2019-11-15')
RARITIES={'Rare':'Rare','RareHolo':'Holo Rare','RareUltra':'Ultra Rare','RareRainbow':'Rainbow Rare','RareSecret':'Secret Rare','RareHoloV':'Holo Rare V','RareHoloVMAX':'Holo Rare VMAX','RareHoloVSTAR':'Holo Rare VSTAR','RareAmazing':'Amazing Rare','RadiantRare':'Radiant Rare','Shiny':'Shiny Rare','ShinyV':'Shiny Holo V','ShinyVMAX':'Shiny Holo VMAX','CharacterRare':'Character Rare','CharacterRareHoloV':'Character Holo V','CharacterRareUltra':'Character Ultra Rare','CharacterRareSecret':'Character Secret Rare','GalarianGalleryHoloRare':'Galarian Gallery Holo Rare','GalarianGalleryUltraRare':'Galarian Gallery Ultra Rare','GalarianGallerySecretRare':'Galarian Gallery Secret Rare','RareUltraBasicEnergy':'Ultra Rare Energy','RareSecretBasicEnergy':'Secret Rare Energy','PromoVUNION':'Promo V-UNION'}
TYPES={'G':'Grass','R':'Fire','W':'Water','L':'Lightning','P':'Psychic','F':'Fighting','D':'Darkness','M':'Metal','C':'Colorless','N':'Dragon','Y':'Fairy'}

def write(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def profile(row, rarity, textured, variant):
    effect=row['foil_effect']
    if variant=='normal': return 'print-only'
    if rarity=='RareAmazing': return 'swsh-amazing'
    if rarity=='RadiantRare': return 'swsh-radiant'
    if rarity=='Shiny': return 'swsh-shiny-silver'
    if row['set_id']=='swsh7-5r': return 'swsh-celebrations-classic'
    if row['card_id']=='swsh3-5_79': return 'swsh-textured'
    if effect=='SwSecret' and rarity in ('RareSecret','RareSecretBasicEnergy','CharacterRareSecret','GalarianGallerySecretRare'): return 'gold-etched'
    if textured: return 'swsh-textured'
    if effect=='SunPillar': return 'swsh-textured'
    if effect=='Cosmos': return 'pokemon-base-set-2-cosmos'
    if effect=='CrackedIce': return 'pokemon-cracked-ice'
    if effect=='SwHolo': return 'pokemon-vertical-line'
    if row['set_id']=='swsh7-5' and effect=='FlatSilver': return 'swsh-celebrations-silver'
    if variant=='reverse': return 'swsh-reverse-energy'
    if effect=='Rainbow': return 'sv_tcgl_illustration_holo'
    return 'swsh-celebrations-silver'

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--extraction',type=Path,required=True);args=ap.parse_args()
    manifests=json.loads((args.extraction/'dataset/manifest.json').read_text())
    records={r['card_id']:r for r in json.loads((args.extraction/'dataset/card-records.json').read_text())}
    coverage=json.loads((args.extraction/'dataset/coverage.json').read_text())
    OUT.mkdir(parents=True,exist_ok=True)
    proofs={cid:(finish,p) for finish,cid,p in CASES}
    def prepare(m):
        record=records[m['card_id']]; row=record['row']; cid=m['card_id']; rarity=m['long_form_id'].split('_')[-3]
        variant='normal' if m['foil_effect']=='NonFoil' else 'reverse' if m['long_form_id'].endswith('_Reverse') or cid.endswith('_ph') else 'holo'
        # Alternative database entries retain their own IDs, never merge by art.
        base=cid.removesuffix('_ph') if m['set_id'] not in ('swshalt','swshbsp') else cid
        appid=base.replace('_','-',1)
        raw={};sources={}; research=ROOT/'research/tcgl'/cid;research.mkdir(parents=True,exist_ok=True)
        for kind,asset in m['assets'].items():
            if asset['status']!='extracted': continue
            source=args.extraction/asset['file']; expected=asset['texture']['png_sha256']
            if digest(source)!=expected: raise ValueError('Source hash mismatch '+cid+' '+kind)
            preserved=research/(kind+'-unity.png')
            if not preserved.exists(): shutil.copyfile(source,preserved)
            raw[kind]=Image.open(source).convert('RGBA')
            sources[kind]={**asset,'preserved':preserved.relative_to(ROOT).as_posix(),'sha256':expected,'dimensions':list(raw[kind].size)}
        if 'front' not in raw: raise ValueError('Missing front '+cid)
        key=hashlib.sha256(('swsh-registration-v1'+sources['front']['sha256']).encode()).hexdigest()[:24]
        frontpath=OUT/'shared'/('front-'+key+'.png'); frontpath.parent.mkdir(exist_ok=True)
        if not frontpath.exists(): registered(raw['front'],(733,1024)).convert('RGB').save(frontpath)
        textured='etch' in raw; chosen=profile(m,rarity,textured,variant); maps={}; limitations=[]
        dest=OUT/cid;dest.mkdir(exist_ok=True)
        def save(name,values):
            path=dest/(name+'.png')
            if not path.exists(): Image.fromarray(np.rint(np.clip(values,0,1)*255).astype(np.uint8)).save(path)
            return '/'+path.relative_to(ROOT/'public').as_posix()
        if variant!='normal':
            if 'foil' not in raw: raise ValueError('Missing foil '+cid)
            controls=dest/'foil-controls.png'
            if not controls.exists(): registered(raw['foil'],(733,1024)).save(controls)
            maps['foilControls']='/'+controls.relative_to(ROOT/'public').as_posix()
            plate=np.asarray(registered(raw['foil'],(733,1024)),np.float32)[...,:3].mean(2)/255
            secondary=np.zeros_like(plate)
            if chosen=='swsh-radiant': secondary[round(1024*.52):]=plate[round(1024*.52):]
            maps['foil']=save('foil',plate-secondary)
            protection=1-np.clip(plate*8,0,1)
            maps['protection']=save('protection',protection)
            maps['roughness']=save('roughness',(.30+.105*(1-plate))*(1-secondary)+.27*secondary)
            if textured:
                normal=dest/'normal.png'
                if not normal.exists():
                    import cv2
                    p=cv2.resize(protection,(1800,2475),interpolation=cv2.INTER_LINEAR)
                    Image.fromarray(normal_pixels(registered(raw['etch'],(733,1024)),p)).save(normal)
                maps['normal']='/'+normal.relative_to(ROOT/'public').as_posix()
            if chosen=='swsh-radiant':
                maps.update(secondaryFoil=save('secondary',secondary),secondaryDirection='/cards/pokemon/swsh-proofs/stock/radiant-field.png')
            if chosen=='swsh-celebrations-classic':
                maps.update(secondaryFoil=maps['foil'],secondaryDirection='/cards/pokemon/swsh-proofs/stock/classic-field.png')
                limitations.append('Classic body frosting boundaries need individual review; conservative whiteplate protection retained.')
            if m['foil_effect']=='Cosmos':
                maps['motif']=save('cosmos-placement-pending',np.zeros((1650,1200),np.float32))
                limitations.append('Exact physical-copy Cosmos placement pending; empty motif map, no invented dots.')
            if m['foil_effect']=='Stamped': limitations.append('Stamped optical finish unsupported; exact assets retained, optical treatment deferred.')
            # Keep the finished proof's own reviewed assets rather than rebuilding it.
            if cid in proofs:
                finish,chosen=proofs[cid]; b='/cards/pokemon/swsh-proofs/'+cid
                maps={'foil':b+'/foil.png','foilControls':b+'/foil-source.png','roughness':b+'/roughness.png'}
                if textured: maps['normal']=b+'/normal.png'
                if finish in ('radiant','classic'):
                    maps.update(secondaryFoil=b+('/secondary.png' if finish=='radiant' else '/foil.png'),secondaryDirection='/cards/pokemon/swsh-proofs/stock/'+('radiant-field.png' if finish=='radiant' else 'classic-field.png'))
        evidence={'tcglCardId':cid,'tcglVariantId':m['long_form_id'],'exportEntry':m,'sources':sources,'profile':chosen,
          'registration':{'unityUvBox':[145/1024,0,878/1024,1],'dimensions':[733,1024],'verticalFlip':False,'polarity':'inverted mean RGB','status':'source-family registration; individual physical review pending'},
          'conversion':{'normalDimensions':[1800,2475],'slopeGain':1.03,'derivatives':'Scharr scale 1/32 before protection','embossStrength':0,'runtimeGeneration':False},
          'limitations':limitations,'maps':maps}
        write(research/'integration-evidence.json',evidence);write(dest/'evidence.json',evidence)
        card={'id':appid,'localId':m['printed_collector_number'],'name':m['name'],'rarity':RARITIES.get(rarity,rarity),
              'category':{1:'Pokemon',2:'Trainer',3:'Energy'}.get(row.get('category'),'Pokemon'),
              'collectorNumber':str(row.get('EN Card #') or m['printed_collector_number'])+'/'+str(row.get('EN Expansion Denominator') or ''),
              'front':frontpath.relative_to(OUT).as_posix(),'variants':[variant],'variantFronts':{variant:frontpath.relative_to(OUT).as_posix()},'foil':{variant:m['foil_effect']}}
        if row.get('EN Type') in TYPES: card['types']=[TYPES[row['EN Type']]]
        if card['category']=='Energy': card['energyType']='Basic' if 'Basic' in m['name'] else 'Special'
        if row.get('EN Evolves From'): card['evolveFrom']=row['EN Evolves From']
        if m['set_id'] in ('swshalt','swshbsp'): card['boosterIds']=[]
        surface={'cardId':appid,'variant':variant,'profile':chosen,'textured':textured,'maps':maps,'evidence':'/cards/pokemon/tcgl-swsh/'+cid+'/evidence.json','foilType':m['foil_effect'], 'limitations':limitations}
        return m['set_id'],card,surface,cid
    sets={sid:{'id':sid,'name':('Champion\u2019s Path' if sid == 'swsh3-5' else meta['name']),'releaseDate':DATES[sid],'logo':None,'seriesId':'swsh','seriesName':'Sword & Shield','assets':'/cards/pokemon/tcgl-swsh','cards':{}} for sid,meta in coverage.items()}
    surfaces=[];identities=[]
    with ThreadPoolExecutor(max_workers=4) as executor:
        for i,(sid,card,surface,cid) in enumerate(executor.map(prepare,manifests)):
            old=sets[sid]['cards'].get(card['id'])
            if old:
                if any(v in old['variants'] for v in card['variants']): raise ValueError('Duplicate printing identity '+cid)
                old['variants']+=card['variants'];old['variantFronts'].update(card['variantFronts']);old['foil'].update(card['foil'])
            else: sets[sid]['cards'][card['id']]=card
            surfaces.append(surface);identities.append({'tcglCardId':cid,'cardId':card['id'],'variant':surface['variant'],'setId':sid})
            if i%100==0: print(i+1,'/',len(manifests),cid,flush=True)
    ordered=[]
    for s in sorted(sets.values(),key=lambda s:(s['releaseDate'],s['id'])):
        s['cards']=list(s['cards'].values());ordered.append(s)
    target=ROOT/'src/pokemon/data/swsh-tcgl.generated.ts'
    # Parsing serialized data avoids TypeScript constructing a 5,853-member
    # inferred union; the schema is checked by the integration audit instead.
    target.write_text('// Generated by scripts/tcgl/import_swsh.py; exact TCGL printings.\nimport type { TcglSvSetRecord } from "./sv-tcgl.generated.ts";\nimport type { TcglSvSurface } from "./sv-tcgl-surfaces.generated.ts";\nexport const tcglSwshSets: readonly (TcglSvSetRecord & {seriesId:string;seriesName:string})[] = JSON.parse('+json.dumps(json.dumps(ordered,ensure_ascii=False),ensure_ascii=False)+');\nexport const tcglSwshSurfaces: readonly (TcglSvSurface & {limitations: string[]})[] = JSON.parse('+json.dumps(json.dumps(surfaces,ensure_ascii=False),ensure_ascii=False)+');\n',encoding='utf-8')
    write(OUT/'printing-index.json',identities)
    write(OUT/'import-audit.json',{'printings':len(identities),'cards':sum(len(s['cards']) for s in ordered),'sets':{s['id']:len(s['cards']) for s in ordered},'shaderChanges':False})
    print('Finished',len(identities),'printings',flush=True)

if __name__=='__main__': main()
