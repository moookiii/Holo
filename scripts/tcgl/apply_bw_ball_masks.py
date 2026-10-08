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
    pattern=cv2.resize(mask[...,:3].mean(2)*mask[...,3],(raw.shape[1],raw.shape[0]),interpolation=cv2.INTER_LINEAR)
    out=ROOT/'public'/record['maps']['foil'].lstrip('/')
    converter.png(out,np.rint(coverage*pattern*255).astype(np.uint8))
    record['profile']='prismatic_standard_reverse'
    evidence['reusedProfile']=record['profile']
    evidence['ballMask']={'status':'applied','source':'User-supplied '+INPUTS[f'{kind}-{layout}'],
        'file':source.relative_to(ROOT).as_posix(),'sha256':converter.digest(source),'dimensions':[mask.shape[1],mask.shape[0]],
        'kind':kind,'layout':layout,'cardStage':stage,
        'method':'Full UV bilinear resize of mean RGB times alpha; multiply exact TCGL foil coverage. Keep protection PNG unchanged. No crop, offset, flip, normal or height conversion.',
        'physicalReview':'Supplied pattern and layout; independent physical-copy calibration pending.'}
    evidence['maps'][out.name]=converter.digest(out)
    evidence['foilMethod']='Exact TCGL continuous coverage multiplied by the user-supplied stage-specific ball PNG in full-card UV coordinates.'
    evidence['finishReview']='User-supplied ball pattern applied with existing smooth silver reverse material; no new shader or etched relief.'
    return True

def main():
    MASK_DIR.mkdir(parents=True,exist_ok=True)
    for key,name in INPUTS.items():
        source=Path('C:/Users/jpall/Pictures')/name;out=MASK_DIR/f'{key}.png'
        if not out.exists():shutil.copyfile(source,out)
        elif out.read_bytes()!=source.read_bytes():raise ValueError('Preserved supplied mask changed: '+name)
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
