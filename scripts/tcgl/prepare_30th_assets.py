"""Prepare anniversary TCGL originals and offline map candidates, no shaders.

Protection/body candidates use the existing TCGL source_regions workflow.
They are explicitly source-derived estimates, not completed contour authoring
or physical finish validation. Raw RGB foil maps remain byte-identical.
"""
from pathlib import Path
import hashlib, json, shutil
import cv2
import numpy as np
from PIL import Image, ImageDraw
from convert_151_set import source_regions
from convert_30th_sources import normal_pixels, SIZE

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/cards/pokemon/30th-celebration'
REVIEW = ROOT / 'artifacts/30th-celebration/source-review'

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path, data): path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
def png(path, values): Image.fromarray(values).save(path,optimize=True)

def main():
    source=json.loads((ROOT/'docs/30th-tcgl-sources.json').read_text(encoding='utf-8'))
    classic_review_path=ROOT/'docs/30th-classic-identity-review.json'
    classic_review={r['tcglCardId']:r for r in json.loads(classic_review_path.read_text())['printings']} if classic_review_path.exists() else {}
    (OUT/'maps').mkdir(parents=True,exist_ok=True);REVIEW.mkdir(parents=True,exist_ok=True)
    records=[];surfaces=[];evidence=[]
    for p in source['printings']:
        key=p['sourceSet']; n=p.get('tcglDatabaseNumber',p['exportEntry'].get('collector_number',{}).get('numeric'))
        if key=='me5-5': id=f'30th-{n:03d}';set_id='30th';local=f'{n:03d}'
        elif key=='me5-5c': id=f'30th-classic-{n:03d}';set_id='30th-classic';local=f'{n:03d}'
        elif key=='me5-5m': local=['R/RGB','G/RGB','B/RGB'][n-1];id=f'30th-rgb-{local[0].lower()}';set_id='30th-rgb'
        else: id=f'mee-{n:03d}';set_id='mee';local=f'{n:03d}'
        stem=p['tcglCardId'].replace('_','-');sources=p['sources']
        for kind,s in sources.items():
            path=ROOT/s['file']
            if digest(path)!=s['sha256']:raise ValueError('Source changed: '+str(path))
            shutil.copyfile(path,OUT/f'{stem}-{kind}.png')
        entry=p['exportEntry'];raw_row=entry.get('rawDatabaseRow',{})
        rarity=entry.get('rarity',{}).get('designation','ENERGY').replace('_',' ').title()
        if key=='mee':rarity='Energy'
        front=f'/cards/pokemon/30th-celebration/{stem}-front.png'
        record={'id':id,'localId':local,'name':p['name'],'setId':set_id,
            'setName':{'30th':'30th Celebration','30th-classic':'30th Celebration · Classic Collection','30th-rgb':'30th Celebration · RGB Mew','mee':'Anniversary Basic Energy'}[set_id],
            'seriesId':'me','seriesName':'Mega Evolution','era':'me','rarity':rarity,
            'category':entry.get('card_type','Pokemon' if raw_row.get('category')=='0x01' else 'Trainer').title().replace('Pokemon','Pokemon'),
            'variants':['holo'],'foil':{'holo':p['foil']['type']},'front':front,'thumbnail':front,
            'tcglCardId':p['tcglCardId'],'tcglVariantId':p['tcglVariantId'],
            'collectorNumber':local if key=='me5-5m' else p['collectorNumber'].get('full') or p['collectorNumber'].get('numerator'),
            'sourceSet':key,'types':[t.title() for t in entry.get('types',[])],
            'sourceEvidence':f'/cards/pokemon/30th-celebration/maps/{stem}-evidence.json'}
        if p['tcglCardId'] in classic_review:
            review=classic_review[p['tcglCardId']]
            if review['frontSha256']!=sources['front']['sha256']:raise ValueError('Classic identity review source changed')
            record['collectorNumber']=record['localId']=review['printedCollectorNumber']
        if entry.get('subtype'):record['energyType' if key=='mee' else 'trainerType']=entry['subtype'].title()
        if raw_row.get('EN Type'):record['types']=[{'G':'Grass','R':'Fire','W':'Water','L':'Lightning','P':'Psychic','F':'Fighting','D':'Darkness','M':'Metal','C':'Colorless','N':'Dragon'}.get(raw_row['EN Type'],raw_row['EN Type'])]
        records.append(record)
        foil=np.asarray(Image.open(ROOT/sources['foil']['file']).convert('RGBA'),np.float32)/255
        raw=Image.open(ROOT/sources['etch']['file']).convert('RGBA') if 'etch' in sources else None
        etch=np.asarray(raw,np.float32)/255 if raw else None
        floor=22/255 if key=='me5-5c' else 0 if key=='me5-5m' else 33/255
        if key=='me5-5m':
            # This is a chromatic optical control texture, not a monochrome print
            # protection map. Preserve it; do not threshold its colors as text.
            protected=np.zeros(foil.shape[:2],np.float32);body=np.zeros_like(protected);regions=[]
        else:protected,body,regions=source_regions(foil,etch,floor)
        protected=cv2.resize(protected,SIZE,interpolation=cv2.INTER_LINEAR)
        body=cv2.resize(body,SIZE,interpolation=cv2.INTER_LINEAR)
        secondary=np.zeros_like(body) # no unverified microdiamond region invented
        maps={'foil':f'/cards/pokemon/30th-celebration/{stem}-foil.png'}
        hashes={}
        for name,values in [('protection',protected),('body',body),('secondary',secondary)]:
            path=OUT/'maps'/f'{stem}-{name}.png';png(path,np.rint(np.clip(values,0,1)*255).astype(np.uint8));hashes[path.name]=digest(path)
        maps['protection']=f'/cards/pokemon/30th-celebration/maps/{stem}-protection.png'
        roughness=(.30+.105*body)*(1-secondary)+.27*secondary
        rough_path=OUT/'maps'/f'{stem}-roughness.png';png(rough_path,np.rint(roughness*255).astype(np.uint8));hashes[rough_path.name]=digest(rough_path)
        maps['roughness']=f'/cards/pokemon/30th-celebration/maps/{stem}-roughness.png'
        if raw:
            # Reference converter differentiates continuous geometry, not masks.
            protection=np.asarray(Image.open(OUT/'maps'/f'{stem}-protection.png'),np.float32)/255
            normal=normal_pixels(raw,protection);path=OUT/'maps'/f'{stem}-normal.png';png(path,normal);hashes[path.name]=digest(path)
            maps['normal']=f'/cards/pokemon/30th-celebration/maps/{stem}-normal.png'
            front_image=Image.open(ROOT/sources['front']['file']).convert('RGB')
            line=np.asarray(raw,np.float32)[...,:3].mean(2)/255
            colored=np.asarray(front_image,np.float32)*(1-line[...,None]*.45)+np.array([0,255,150])*line[...,None]*.45
            overlay=Image.fromarray(np.clip(colored,0,255).astype(np.uint8));overlay.save(REVIEW/f'{stem}-overlay.png')
            sheet=Image.new('RGB',(733*4,1052),'#222');draw=ImageDraw.Draw(sheet)
            for col,(label,img) in enumerate([('original TCGL front',front_image),('original TCGL etch',raw),('etch over paired front',overlay),('TCGL foil map',Image.open(ROOT/sources['foil']['file']))]):
                sheet.paste(img.convert('RGB').resize((733,1024),Image.Resampling.BILINEAR),(col*733,28));draw.text((col*733+5,5),stem+' | '+label,fill='white')
            sheet.save(REVIEW/f'{stem}-source.png')
        profile='prismatic_sir_texture' if raw else 'pokemon151_ex_holo' if p['foil']['type']=='SUN_PILLAR' and rarity=='Double Rare' else 'sv_tcgl_illustration_holo' if p['foil']['type']=='SUN_PILLAR' else 'sv_tcgl_regular_holo'
        item={'cardId':id,'tcglCardId':p['tcglCardId'],'tcglVariantId':p['tcglVariantId'],'sources':sources,
            'dimensions':list(SIZE),'maps':hashes,'foilMap':'byte-identical RGBA TCGL PNG; no intensity remap',
            'foilDeclaration':p['foil'],'profile':profile,'temporaryMaterial':True,'physicalFinishReview':'pending Astra High',
            'registrationReview':'pending per-card source inspection','protectionReview':'pending high-resolution boundary/glyph authoring',
            'bodyMethod':'Existing TCGL foil/etch connected-component source_regions estimates; no front brightness',
            'bodyCandidates':regions,'secondaryMethod':'Empty pending exact-print microdiamond evidence; no substitute motifs',
            'normalConversion':{'polarity':'inverted mean RGB (reference convention; per-card review pending)','verticalFlip':False,'crop':None,'offset':[0,0],
                'resize':'full-domain bilinear','derivative':'Scharr CV_32F scale 1/32 before protection','gain':1.03,'convention':'OpenGL +Y','opaqueRgb':True,'embossStrength':0} if raw else None,
            'limitations':['TCGL geometry is not measured physical groove depth.','Source-derived region estimates need contour review.','Temporary profiles do not reproduce Pikachu, Classic, RGB or Futuristic optical finishes.']}
        write(OUT/'maps'/f'{stem}-evidence.json',item);evidence.append(item)
        surfaces.append({'cardId':id,'profile':profile,'textured':bool(raw),'maps':maps,'evidence':record['sourceEvidence']})
    write(OUT/'catalog.json',records);write(OUT/'surfaces.json',surfaces)
    (ROOT/'src/pokemon/data/30th.generated.ts').write_text('// Exact TCGL anniversary identities; generated offline.\nexport const celebrationRecords = '+json.dumps(records,ensure_ascii=False,indent=2)+' as const;\nexport const celebrationSurfaces = '+json.dumps(surfaces,ensure_ascii=False,indent=2)+' as const;\n',encoding='utf-8')
    write(ROOT/'docs/30th-asset-preparation.json',{'cards':len(records),'normals':sum(s['textured'] for s in surfaces),'physicalFinishValidated':False,'printings':evidence})
    print('Prepared 199 exact fronts/foil maps; 45 reference normal candidates. Region and physical reviews remain explicit.',flush=True)

if __name__=='__main__':main()
