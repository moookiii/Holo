"""Apply the user's registered PNG ball masks inside exact TCGL coverage."""
from pathlib import Path
import hashlib, json, shutil
from collections import Counter
import cv2
import numpy as np
from PIL import Image
import convert_151_set as converter
from convert_sv_sets import black_floor
from fetch_sv_additions import ROOT

MASK_DIR=ROOT/'public/materials/bw-ball-masks'
INPUTS={'poke-evolved':'poke evo.png','master-evolved':'master evo.png',
        'poke-basic':'pokeball basic.png','master-basic':'master basic.png'}

def apply(p,record,evidence):
    variant=p['tcglVariantId']
    kind='poke' if '_CastAndCure_SVPokeBall' in variant else 'master' if '_CastAndCure_SVMasterBall' in variant else None
    if kind is None:return False
    stage=p['exportEntry'].get('stage','BASIC')
    layout='evolved' if stage in ('STAGE1','STAGE2') else 'basic'
    source=MASK_DIR/f'{kind}-{layout}.png'
    raw=np.asarray(Image.open(ROOT/p['sources']['foil']['file']).convert('RGBA'),np.float32)/255
    floor,_=black_floor(p['sources']['foil'])
    coverage=np.clip((raw[...,:3].mean(2)-floor)/(1-floor),0,1)*raw[...,3]
    mask=np.asarray(Image.open(source).convert('RGBA'),np.float32)/255
    out=ROOT/'public'/record['maps']['foil'].lstrip('/')
    # Keep continuous metal separate from the symbol die. Pattern visibility
    # gates diffraction/glints, never removes the smooth silver between symbols.
    converter.png(out,np.rint(coverage*255).astype(np.uint8))
    record['maps']['pattern']='/materials/bw-ball-masks/'+source.name
    optics=MASK_DIR/f'{kind}-{layout}-optics.png'
    if not optics.exists():raise ValueError('Prepare shared optical PNGs first')
    record['maps']['direction']='/materials/bw-ball-masks/'+optics.name
    record['profile']='bw-pokeball-reverse' if kind=='poke' else 'bw-masterball-reverse'
    evidence['reusedProfile']=record['profile']
    evidence['ballMask']={'status':'applied','source':'User-supplied '+INPUTS[f'{kind}-{layout}'],
        'file':source.relative_to(ROOT).as_posix(),'sha256':converter.digest(source),'dimensions':[mask.shape[1],mask.shape[0]],
        'kind':kind,'layout':layout,'cardStage':stage,
        'method':'Unchanged full-card PNG controls pattern visibility separately from continuous exact TCGL foil coverage. Cap interiors from local mask occupancy control fine optical grain. Protection unchanged. No crop, offset, flip, normal or height conversion.',
        'physicalReview':'Calibrated against supplied Snivy Poké Ball and Master Ball photos; dynamic physical-copy calibration remains approximate.',
        'optics':{'file':optics.relative_to(ROOT).as_posix(),'sha256':converter.digest(optics),'dimensions':[mask.shape[1],mask.shape[0]],
            'encoding':'RG neutral 128; B cap-interior grain weight; A opaque 255. Optical data only, no normal or height.'}}
    evidence['maps'][out.name]=converter.digest(out)
    evidence['foilMethod']='Exact TCGL continuous coverage with decoded black floor removed. Separate user-supplied full-card pattern mask clips only the optical symbol response.'
    evidence['finishReview']='Dedicated BW Poké Ball/Master Ball cast-and-cure spectrum and fine cap grain over continuous silver; shared viewer/gallery optical kernel; no etched relief.'
    return True

def main():
    MASK_DIR.mkdir(parents=True,exist_ok=True)
    for key,name in INPUTS.items():
        source=Path('C:/Users/jpall/Pictures')/name;out=MASK_DIR/f'{key}.png'
        if not out.exists():shutil.copyfile(source,out)
        elif source.exists() and out.read_bytes()!=source.read_bytes():raise ValueError('Preserved supplied mask changed: '+name)
        rgba=np.asarray(Image.open(out).convert('RGBA'),np.float32)/255
        occupancy=cv2.boxFilter(rgba[...,:3].mean(2)*rgba[...,3],-1,(11,11),borderType=cv2.BORDER_REPLICATE)
        cap=np.clip((occupancy-.55)/.4,0,1)
        field=np.full(rgba.shape,128,np.uint8);field[...,2]=np.rint(cap*255).astype(np.uint8);field[...,3]=255
        converter.png(MASK_DIR/f'{key}-optics.png',field)
    counts=Counter()
    for set_id in ('sv10.5b','sv10.5w','svalt'):
        base=ROOT/f'public/cards/pokemon/tcgl-sv/{set_id}/tcgl'
        manifest=base/'manifest.json';records=json.loads(manifest.read_text(encoding='utf-8'))
        source=json.loads((ROOT/f'research/tcgl/{set_id}-set/sources.json').read_text(encoding='utf-8'))
        printings={(p['cardId'],p['variant']):p for p in source['printings']}
        for record in records:
            p=printings[(record['cardId'],record['variant'])]
            if not any(v in p['tcglVariantId'] for v in ('_CastAndCure_SVPokeBall','_CastAndCure_SVMasterBall')):continue
            ep=ROOT/'public'/record['evidence'].lstrip('/');evidence=json.loads(ep.read_text(encoding='utf-8'))
            if apply(p,record,evidence):
                counts[set_id]+=1;counts[evidence['ballMask']['kind']+'-'+evidence['ballMask']['layout']]+=1
                ep.write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8')
        manifest.write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(counts),indent=2))

if __name__=='__main__':main()
