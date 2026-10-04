"""Apply the shared Sylveon/Espeon offline method to each exact TCGL source."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse,json
import numpy as np
import cv2
from PIL import Image
import convert_151_set as converter

ROOT=converter.ROOT

def black_floor(source):
    rgba=np.asarray(Image.open(ROOT/source['file']).convert('RGBA'))
    low=rgba[(rgba[...,:3].mean(2)<51)&(rgba[...,3]>127),:3]
    if len(low)==0:raise ValueError('No black reference in foil: '+source['file'])
    packed=low[:,0].astype(np.uint32)*65536+low[:,1].astype(np.uint32)*256+low[:,2]
    colors,counts=np.unique(packed,return_counts=True)
    mode=int(colors[np.argmax(counts)]);value=np.array([mode>>16,(mode>>8)&255,mode&255])
    return float(value.mean()/255),value.tolist()

def main():
    cv2.setNumThreads(1)
    converter.FOIL_NATIVE=True;converter.OMIT_HEIGHT=True
    parser=argparse.ArgumentParser();parser.add_argument('--sets',nargs='+',default=[f'sv{i:02d}' for i in range(1,11)]);args=parser.parse_args();records=[]
    for set_id in args.sets:
        converter.ASSETS=ROOT/f'public/cards/pokemon/tcgl-sv/{set_id}'
        converter.OUT=converter.ASSETS/'tcgl';converter.OUT.mkdir(exist_ok=True)
        converter.PUBLIC_BASE=f'/cards/pokemon/tcgl-sv/{set_id}';converter.PROFILE_PREFIX='sv_tcgl_'
        source_path=ROOT/f'research/tcgl/{set_id}-set/sources.json';source=json.loads(source_path.read_text())
        review_path=ROOT/f'artifacts/sv-tcgl/source-review/{set_id}/review.json'
        if not review_path.exists():raise ValueError('Inspect and record source family review first: '+set_id)
        review=json.loads(review_path.read_text())
        if not review.get('inspected'):raise ValueError('Source family review not recorded: '+set_id)
        for p in source['printings']:
            front=converter.ASSETS/(p['number']+'.png')
            if converter.digest(front)!=p['sources']['front']['sha256']:raise ValueError('Front registration changed')
            p['alignmentReview']={'status':'source-family-reviewed','verticalFlip':False,'cropOrOffset':False,'etchPolarity':'Inverted mean RGB; white grooves recessed.' if 'etch' in p['sources'] else 'No etch source; smooth.', 'method':'Paired exact TCGL full-card front; source-family contact sheets inspected. No independent angled-photo calibration for every card.','capture':review['captures'],'holoFrontSha256':converter.digest(front)}
            if set_id=='sv08' and p['number']=='162':p['alignmentReview']['providerCaveat']=review.get('providerCaveat')
            if 'foil' in p['sources']:p['foilBlackFloor'],p['foilBlackFloorRgb']=black_floor(p['sources']['foil'])
        def build(p):
            result=converter.convert(p,False)
            if result:print(set_id+' '+p['number']+' '+p['variant']+' converted',flush=True)
            return result
        with ThreadPoolExecutor(max_workers=4) as pool:built=[r for r in pool.map(build,source['printings']) if r]
        # These inspection-only copies were emitted by this new set pipeline;
        # exact raw etches remain preserved and normals already encode relief.
        for p in source['printings']:
            height_path=converter.OUT/(p['number']+'-'+p['variant']+'-height.png')
            if height_path.exists():height_path.unlink()
        (converter.OUT/'manifest.json').write_text(json.dumps(built,indent=2)+'\n')
        source_path.write_text(json.dumps(source,indent=2)+'\n');records.extend(built)
        print(f'{set_id}: complete {len(built)} exact foil printings',flush=True)
    # Include previously completed sets when converting a resumed subset.
    all_records=[]
    for i in range(1,11):
        manifest=ROOT/f'public/cards/pokemon/tcgl-sv/sv{i:02d}/tcgl/manifest.json'
        if manifest.exists():all_records.extend(json.loads(manifest.read_text()))
    text='// Exact TCGL surfaces; generated offline.\nimport type { CardMapPaths } from "../../card/CardDefinition.ts";\nexport interface TcglSvSurface { cardId: string; variant: string; profile: string; textured: boolean; maps: CardMapPaths; evidence: string; foilType: string; }\nexport const tcglSvSurfaces: readonly TcglSvSurface[] = '+json.dumps(all_records,indent=2)+';\n'
    (ROOT/'src/pokemon/data/sv-tcgl-surfaces.generated.ts').write_text(text)

if __name__=='__main__':main()
