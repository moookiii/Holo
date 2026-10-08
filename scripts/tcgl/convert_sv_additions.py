"""Convert reviewed missing SV printings, reusing existing material profiles."""
from concurrent.futures import ThreadPoolExecutor
import argparse,json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
import convert_151_set as converter
from convert_sv_sets import black_floor
from fetch_sv_additions import PRODUCTS, ROOT

def profile(p):
    foil=p['foil']['type']; rarity=p['rarity']; variant=p['variant']
    if 'etch' in p['sources']: return 'prismatic_sir_texture'
    if variant=='pokeball-reverse': return 'prismatic_pokeball_reverse'
    if variant=='masterball-reverse': return 'prismatic_masterball_reverse'
    if foil=='COSMOS': return 'pokemon-base-set-2-cosmos'
    if foil=='TINSEL': return 'pokemon-tinsel'
    if foil=='CRACKED_ICE': return 'pokemon-cracked-ice'
    if foil=='ACE_FOIL': return 'pokemon-ace-spec'
    if foil in ('FLAT_SILVER','STAMPED'): return 'sv_tcgl_standard_reverse'
    if foil=='SV_HOLO': return 'sv_tcgl_regular_holo'
    if foil=='SUN_PILLAR': return 'sv_tcgl_illustration_holo' if rarity=='Illustration Rare' else 'sv_tcgl_ex_holo'
    if foil=='SV_ULTRA': return 'prismatic_ex_holo'
    raise ValueError('Unclassified TCGL finish '+foil)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--sets',nargs='+',default=list(PRODUCTS));args=parser.parse_args()
    cv2.setNumThreads(1);converter.FOIL_NATIVE=True;converter.OMIT_HEIGHT=True
    for set_id in args.sets:
        converter.ASSETS=ROOT/f'public/cards/pokemon/tcgl-sv/{set_id}'
        converter.OUT=converter.ASSETS/'tcgl';converter.OUT.mkdir(exist_ok=True)
        converter.PUBLIC_BASE=f'/cards/pokemon/tcgl-sv/{set_id}';converter.PROFILE_PREFIX=''
        source_path=ROOT/f'research/tcgl/{set_id}-set/sources.json'
        source=json.loads(source_path.read_text(encoding='utf-8'))
        review_path=ROOT/f'artifacts/sv-tcgl/source-review/{set_id}/review.json'
        review=json.loads(review_path.read_text(encoding='utf-8'))
        if not review.get('inspected'): raise ValueError('Inspect source review first: '+set_id)
        selected=[p for p in source['printings'] if 'foil' in p['sources']]
        for p in selected:
            front=converter.ASSETS/p['frontFile']
            if converter.digest(front)!=p['sources']['front']['sha256']: raise ValueError('Printing front changed')
            p['alignmentReview']={'status':'source-family-reviewed','verticalFlip':False,'cropOrOffset':False,
                'etchPolarity':'Inverted mean RGB; white grooves recessed.' if 'etch' in p['sources'] else 'No etch source.',
                'method':'Paired full-domain TCGL source-family review. Individual high-zoom/physical-photo validation remains pending outside the sampled cards.',
                'capture':review['captures'],'holoFrontSha256':converter.digest(front)}
            p['foilBlackFloor'],p['foilBlackFloorRgb']=black_floor(p['sources']['foil'])
            p['treatment']=profile(p)
        def build(p):
            result=converter.convert(p,False)
            path=converter.OUT/(p['number']+'-'+p['variant']+'-evidence.json')
            evidence=json.loads(path.read_text())
            evidence.update({'exportUrl':p['exportUrl'],'exportEntry':p['exportEntry'],'frontFile':p['frontFile'],
                'reusedProfile':result['profile'],'individualVisualReview':'pending except source-family samples',
                'physicalPhotoReview':'pending; TCGL geometry does not measure depth'})
            if p['foil']['type']=='COSMOS':
                motif=converter.OUT/(p['number']+'-'+p['variant']+'-motif.png')
                converter.png(motif,np.zeros((1650,1200),np.uint8))
                result['maps']['motif']=converter.PUBLIC_BASE+'/tcgl/'+motif.name
                evidence['cosmosPlacement']={'status':'pending','reason':'TCGL foil asset supplies coverage, not reviewed physical-copy dot placement. Empty registered motif; no random dots.'}
                evidence['maps'][motif.name]=converter.digest(motif);evidence['mapDimensions'][motif.name]=[1200,1650]
            if p['rarity']=='Black White Rare':
                evidence['finishReview']='Existing etched reference reused; dedicated Black/White Rare ink/foil angular response remains unimplemented.'
            if p['foil']['type']=='STAMPED':
                evidence['finishReview']='Exact TCGL foil coverage with existing smooth silver response; stamped promo angular response remains unimplemented.'
            evidence['rendererReady']=True
            path.write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8')
            print(set_id+' '+p['number']+' '+p['variant']+' '+result['profile'],flush=True)
            return result
        with ThreadPoolExecutor(max_workers=4) as pool: records=list(pool.map(build,selected))
        (converter.OUT/'manifest.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
        source_path.write_text(json.dumps(source,indent=2)+'\n',encoding='utf-8')
        print(f'{set_id}: converted {len(records)} exact foil printings',flush=True)
    records=[]
    for manifest in sorted((ROOT/'public/cards/pokemon/tcgl-sv').glob('*/tcgl/manifest.json')):
        records.extend(json.loads(manifest.read_text(encoding='utf-8')))
    target=ROOT/'src/pokemon/data/sv-tcgl-surfaces.generated.ts'
    header=target.read_text(encoding='utf-8').split('= ',1)[0]
    target.write_text(header+'= '+json.dumps(records,indent=2)+';\n',encoding='utf-8')

if __name__=='__main__': main()
