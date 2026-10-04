"""Create representative paired TCGL source-family sheets before conversion."""
import argparse,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from convert_sv_sets import black_floor
ROOT=Path(__file__).resolve().parents[2]

def tile(p):
    canvas=Image.new('RGB',(600,455),'#151a20');draw=ImageDraw.Draw(canvas)
    draw.text((5,3),p['number']+' '+p['name']+' / '+p['variant']+' / '+p['foil']['type'],fill='white')
    front=Image.open(ROOT/p['sources']['front']['file']).convert('RGB')
    foil=Image.open(ROOT/p['sources']['foil']['file']).convert('RGBA')
    etch=Image.open(ROOT/p['sources']['etch']['file']).convert('RGB') if 'etch' in p['sources'] else Image.new('RGB',front.size,'#808080')
    raw=np.asarray(foil.resize(front.size,Image.Resampling.BILINEAR),np.float32)/255;floor,_=black_floor(p['sources']['foil'])
    coverage=np.clip((raw[...,:3].mean(2)-floor)/(1-floor),0,1)*raw[...,3]
    rgb=np.asarray(front,np.float32)/255
    overlay=Image.fromarray(np.rint(np.clip(rgb*(1-coverage[...,None]*.5)+np.array([0,.95,.35])*coverage[...,None]*.5,0,1)*255).astype(np.uint8))
    for i,(im,label) in enumerate([(front,'Exact front'),(foil.convert('RGB'),'Exact foil'),(etch,'Exact etch'),(overlay,'Full UV overlay')]):
        im.thumbnail((295,205));x=i%2*300;y=20+i//2*215
        draw.text((x+3,y),label,fill='#cad3dc');canvas.paste(im,(x+(300-im.width)//2,y+13))
    return canvas

def main():
    parser=argparse.ArgumentParser();parser.add_argument('sets',nargs='+');args=parser.parse_args()
    for set_id in args.sets:
        source=ROOT/f'research/tcgl/{set_id}-set/sources.json'
        ps=[p for p in json.loads(source.read_text())['printings'] if 'foil' in p['sources']]
        groups={}
        for p in ps:
            # Review every distinct foil/etch, rarity and basic/evolved reverse family.
            key=(p['variant'],p['foil']['type'],p['rarity'],'etch' in p['sources'], p['sources']['foil']['dimensions'][0])
            groups.setdefault(key,[]).append(p)
        selected=[]
        for group in groups.values():
            selected.append(group[0])
            if len(group)>1:selected.append(group[-1])
        out=ROOT/f'artifacts/sv-tcgl/source-review/{set_id}';out.mkdir(parents=True,exist_ok=True);captures=[]
        for start in range(0,len(selected),6):
            sheet=Image.new('RGB',(1800,910),'#151a20')
            for i,p in enumerate(selected[start:start+6]):sheet.paste(tile(p),(i%3*600,i//3*455))
            path=out/f'page-{start//6+1:02d}.jpg';sheet.save(path,quality=95);captures.append(path.relative_to(ROOT).as_posix())
        (out/'review.json').write_text(json.dumps({'inspected':False,'captures':captures,'printings':[p['tcglVariantId'] for p in selected]},indent=2)+'\n')
        print(set_id, len(selected),'representative printings',len(captures),'sheets',flush=True)

if __name__=='__main__':main()
