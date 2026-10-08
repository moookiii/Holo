"""Supplement missing SVP nonfoil fronts from TCGdex without fabricating foil.

TCGL remains authoritative for existing printings and all foil maps.
"""
from pathlib import Path
import argparse, hashlib, json, shutil
from PIL import Image
from fetch_sv_sets import ROOT, fetch

CANDIDATES = (85, 102, 190, 191, 192, 213, 214, 215, 225, 500)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--provided-085',type=Path,help='User-approved nonfoil front for SVP 085')
    parser.add_argument('--provided-front',action='append',default=[],metavar='NUMBER=PATH')
    parser.add_argument('--crop',action='append',default=[],metavar='NUMBER=LEFT,TOP,RIGHT,BOTTOM',help='Exact pixel crop, without resampling')
    args=parser.parse_args()
    catalog=json.loads((ROOT/'public/cards/pokemon/tcgl-sv/svp/catalog.json').read_text())
    existing={int(c['localId']) for c in catalog}
    dest=ROOT/'public/cards/pokemon/tcgl-sv/svp/tcgdex'
    raw=ROOT/'research/tcgdex/svp-nonfoil'
    dest.mkdir(parents=True,exist_ok=True);raw.mkdir(parents=True,exist_ok=True)
    provided_inputs={int(value.split('=',1)[0]):Path(value.split('=',1)[1]) for value in args.provided_front}
    crop_inputs={int(value.split('=',1)[0]):[int(v) for v in value.split('=',1)[1].split(',')] for value in args.crop}
    if args.provided_085: provided_inputs[85]=args.provided_085
    for n,path in provided_inputs.items():
        if n not in CANDIDATES: raise ValueError('Unknown supplemental number '+str(n))
        shutil.copyfile(path,raw/f'{n:03d}-supplied.png')
    records=[];review=[]
    for n in CANDIDATES:
        if n in existing: continue
        endpoint=f'https://api.tcgdex.net/v2/en/cards/svp-{n:03d}'
        payload=fetch(endpoint);(raw/f'{n:03d}.json').write_bytes(payload)
        card=json.loads(payload);variants=card['variants']
        if not variants.get('normal') or variants.get('holo'):
            review.append({'number':n,'name':card['name'],'status':'foil-source-required'});continue
        supplied=raw/f'{n:03d}-supplied.png'
        if not supplied.exists() and (dest/f'{n}-source.json').exists():
            prior=json.loads((dest/f'{n}-source.json').read_text())
            if prior.get('provider')=='User supplied':
                preserved=dest/f'{n}-original.png' if prior.get('cropPixels') else dest/f'{n}.png'
                shutil.copyfile(preserved,supplied)
        provided=supplied.exists()
        url=None if provided else (card.get('image') or f'https://assets.tcgdex.net/en/sv/svp/{n:03d}')+'/high.png'
        try: image=supplied.read_bytes() if provided else fetch(url)
        except Exception as error:
            review.append({'number':n,'name':card['name'],'status':'tcgdex-image-unavailable','url':url,'error':str(error)});continue
        source=raw/f'{n:03d}.png';source.write_bytes(image)
        with Image.open(source) as im: source_dimensions=list(im.size);im.verify()
        crop=crop_inputs.get(n)
        if crop is None and provided and (dest/f'{n}-source.json').exists() and n not in provided_inputs:
            crop=json.loads((dest/f'{n}-source.json').read_text()).get('cropPixels')
        front=dest/f'{n}.png'
        if crop:
            if len(crop)!=4 or not (0<=crop[0]<crop[2]<=source_dimensions[0] and 0<=crop[1]<crop[3]<=source_dimensions[1]): raise ValueError('Invalid crop')
            shutil.copyfile(source,dest/f'{n}-original.png')
            with Image.open(source) as im: im.crop(crop).save(front)
        else: shutil.copyfile(source,front)
        with Image.open(front) as im: dimensions=list(im.size)
        provider='User supplied' if provided else 'TCGdex'
        evidence={'provider':provider,'metadataProvider':'TCGdex','cardId':f'svp-{n}','tcgdexId':card['id'],'variant':'normal',
                  'metadataUrl':endpoint,'imageUrl':url,'dimensions':dimensions,
                  'imageSha256':hashlib.sha256(image).hexdigest(),'metadataSha256':hashlib.sha256(payload).hexdigest(),
                  'sourceDimensions':source_dimensions,'cropPixels':crop,'outputSha256':hashlib.sha256(front.read_bytes()).hexdigest(),
                  'metadata':card,'finish':'Print only; only the nonfoil printing is imported. No foil inferred from artwork.'}
        (dest/f'{n}-source.json').write_text(json.dumps(evidence,indent=2)+'\n')
        records.append({'id':f'svp-{n}','localId':f'{n:03d}','name':card['name'],'rarity':card['rarity'],
                        'category':card['category'],'stage':card.get('stage'),'types':card.get('types',[]),
                        'front':f'tcgdex/{n}.png','collectorNumber':f'{n:03d}','variants':['normal'],'foil':{},
                        'sourceEvidence':f'/cards/pokemon/tcgl-sv/svp/tcgdex/{n}-source.json','imageProvider':provider})
        review.append({'number':n,'name':card['name'],'status':'imported-nonfoil','dimensions':dimensions})
    (dest/'catalog.json').write_text(json.dumps(records,indent=2)+'\n')
    (dest/'import-review.json').write_text(json.dumps(review,indent=2)+'\n')
    output=ROOT/'src/pokemon/data/svp-tcgdex-nonfoil.generated.ts'
    output.write_text('// Nonfoil SVP supplements from TCGdex; generated offline.\n'
                      'import type { TcglSvCardRecord } from "./sv-tcgl.generated.ts";\n'
                      'export const svpTcgdexNonfoil: readonly (TcglSvCardRecord & { sourceEvidence: string; imageProvider: string })[] = '
                      +json.dumps(records,indent=2)+';\n')
    print(json.dumps(review,indent=2))

if __name__=='__main__': main()
