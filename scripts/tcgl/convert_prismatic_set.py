"""Offline TCGL foil coverage and reference tangent normals for the full set.

Sources must be visually reviewed first. --record-source-review records that
human/agent inspection; it is not an automatic alignment test.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse, hashlib, io, json
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'research/tcgl/prismatic-set/sources.json'
ASSETS = ROOT / 'public/cards/pokemon/prismatic-evolutions'
OUT = ASSETS / 'tcgl'
SIZE = (1800,2475)
AUTHORED = {'133','144','146','149','150','153','155','156','161','167'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def png(path, data):
    output=io.BytesIO(); Image.fromarray(data).save(output,format='PNG')
    content=output.getvalue()
    if not path.exists() or path.read_bytes()!=content:
        temporary=path.with_suffix('.tmp.png');temporary.write_bytes(content);temporary.replace(path)


def mask(path):
    im=Image.open(path).convert('RGBA'); rgba=np.asarray(im,np.float32)/255
    value=np.asarray(im.convert('L'),np.float32)/255*rgba[...,3]
    return cv2.resize(value,SIZE,interpolation=cv2.INTER_LINEAR)


def source_regions(foil, etch):
    """Source-mask print boundaries; distinguish grooved opaque body from text.

    These are coating/protection estimates from the supplied TCGL maps, never
    from front brightness. Existing reviewed SIR regions are retained instead.
    """
    luminance=foil[...,:3].mean(2)
    opaque=(luminance<=28/255)&(foil[...,3]>.5)
    protected=np.clip((30/255-luminance)/(8/255),0,1)*foil[...,3]
    body=np.zeros(opaque.shape,np.float32)
    estimates=[]
    if etch is not None:
        count,labels,stats,_=cv2.connectedComponentsWithStats(opaque.astype(np.uint8),8)
        eh=cv2.resize(etch[...,:3].mean(2),(foil.shape[1],foil.shape[0]),interpolation=cv2.INTER_LINEAR)
        mean=cv2.boxFilter(eh,-1,(5,5)); variance=np.maximum(cv2.boxFilter(eh*eh,-1,(5,5))-mean*mean,0)
        for label in range(1,count):
            area=int(stats[label,cv2.CC_STAT_AREA])
            if area<150: continue
            region=(labels==label).astype(np.uint8)
            interior=cv2.erode(region,np.ones((3,3),np.uint8)).astype(bool)
            if not interior.any(): continue
            textured=float(np.mean(variance[interior]>.0064))
            if textured>.4:
                body[labels==label]=1;protected[labels==label]=0
                estimates.append({'areaAtFoilResolution':area,'texturedInteriorFraction':textured})
    return protected,body,estimates


def convert(printing,record_review):
    number=printing['number'];variant=printing['variant']; sources=printing['sources']
    front=ASSETS/(number+'.png')
    if record_review:
        printing['alignmentReview']={'status':'reviewed','verticalFlip':False,'cropOrOffset':False,
          'method':'Exact TCGL front, foil and etch with colored coverage overlay on unchanged Holo front, inspected before conversion.',
          'capture':f"artifacts/prismatic-tcgl-set/source-review/page-{printing['reviewPage']:02d}.jpg",
          'holoFrontSha256':digest(front),'etchPolarity':'Inverted mean RGB luminance; white lines recessed.' if 'etch' in sources else 'No etch asset; smooth surface.'}
    review=printing['alignmentReview']
    if not isinstance(review,dict) or review.get('status')!='reviewed' or review['holoFrontSha256']!=digest(front):
        raise ValueError('Source/front review required: '+number+' '+variant)
    for source in sources.values():
        if digest(ROOT/source['file'])!=source['sha256']:raise ValueError('Raw source changed')
    if 'foil' not in sources:return None
    prefix=number+'-'+variant+'-'
    raw_foil=np.asarray(Image.open(ROOT/sources['foil']['file']).convert('RGBA'),np.float32)/255
    # TCGL's compressed neutral black is 22/255 in the preserved PNG/tex
    # samples. Remove that black floor; retain all continuous gray coverage.
    foil=np.clip((raw_foil[...,:3].mean(2)-22/255)/(233/255),0,1)*raw_foil[...,3]
    foil=cv2.resize(foil,SIZE,interpolation=cv2.INTER_LINEAR)
    raw_etch=np.asarray(Image.open(ROOT/sources['etch']['file']).convert('RGBA'),np.float32)/255 if 'etch' in sources else None
    protection,body,regions=source_regions(raw_foil,raw_etch)
    protection=cv2.resize(protection,SIZE,interpolation=cv2.INTER_LINEAR)
    body=cv2.resize(body,SIZE,interpolation=cv2.INTER_LINEAR)
    secondary=np.zeros_like(body)
    retained=[]
    if number in AUTHORED and variant=='holo':
        for name in ('protection','body','secondary-foil'):
            path=ASSETS/'maps'/f'{number}-holo-{name}.png'
            if path.exists():
                value=mask(path)
                if name=='protection':protection=value
                elif name=='body':body=value
                else:secondary=value
                retained.append({'file':path.relative_to(ROOT).as_posix(),'sha256':digest(path)})
    png(OUT/(prefix+'foil.png'),np.rint(foil*255).astype(np.uint8))
    png(OUT/(prefix+'protection.png'),np.rint(protection*255).astype(np.uint8))
    maps={name:'/cards/pokemon/prismatic-evolutions/tcgl/'+prefix+name+'.png' for name in ('foil','protection')}
    if secondary.any():
        png(OUT/(prefix+'secondary-foil.png'),np.rint(secondary*255).astype(np.uint8));maps['secondaryFoil']='/cards/pokemon/prismatic-evolutions/tcgl/'+prefix+'secondary-foil.png'
    if raw_etch is not None:
        height=cv2.resize(1-raw_etch[...,:3].mean(2),SIZE,interpolation=cv2.INTER_LINEAR)
        alpha=cv2.resize(raw_etch[...,3],SIZE,interpolation=cv2.INTER_LINEAR)
        dx=cv2.Scharr(height,cv2.CV_32F,1,0,scale=1/32);dy=cv2.Scharr(height,cv2.CV_32F,0,1,scale=1/32)
        nx=-dx*1.03*(1-protection);ny=dy*1.03*(1-protection)
        length=np.sqrt(nx*nx+ny*ny+1)
        normal=np.stack((nx/length,ny/length,1/length),axis=2)
        normal=normal*alpha[...,None]+np.array([0,0,1],np.float32)*(1-alpha[...,None])
        encoded=np.rint(np.clip(normal*.5+.5,0,1)*255).astype(np.uint8)
        png(OUT/(prefix+'normal.png'),encoded)
        png(OUT/(prefix+'height.png'),np.rint((.5+(height-.5)*.25)*255).astype(np.uint8))
        roughness=(.30+.105*body)*(1-secondary)+.27*secondary
        png(OUT/(prefix+'roughness.png'),np.rint(roughness*255).astype(np.uint8))
        for name in ('normal','height','roughness'):maps[name]='/cards/pokemon/prismatic-evolutions/tcgl/'+prefix+name+'.png'
        if not np.all(encoded[protection==1]==[128,128,255]):raise ValueError('Protected normal is not flat')
    treatment={'rare':'regular_holo','double rare':'ex_holo','ace spec rare':'ace_spec','ultra rare':'fullart_texture','special illustration rare':'sir_texture','hyper rare':'gold'}.get(printing['rarity'].lower())
    if variant!='holo':treatment={'reverse':'standard_reverse','pokeball-reverse':'pokeball_reverse','masterball-reverse':'masterball_reverse'}[variant]
    if not treatment:raise ValueError('Unknown rarity: '+printing['rarity'])
    evidence={'cardId':printing['cardId'],'variant':variant,'tcglCardId':printing['tcglCardId'],'tcglVariantId':printing['tcglVariantId'],
      'sources':sources,'alignmentReview':review,'textured':raw_etch is not None,'rendererReady':False,'mapSize':list(SIZE),
      'normalMethod':'Inverted mean TCGL etch RGB; full-domain bilinear resize; unblurred Scharr scale 1/32; gain 1.03; protection on slopes after derivative; normalize; source alpha flatten; opaque RGB OpenGL +Y (-dx,+drow,+Z).',
      'foilMethod':'Mean source RGB with decoded black floor 22/255 removed, alpha multiplied, full-domain bilinear resize. No crop, flip or offset. Continuous grayscale coverage retained.',
      'protectedBodyRegions':regions,'retainedRegions':retained,'normalScale':1 if raw_etch is not None else 0,'embossStrength':0,
      'limitations':'TCGL supplies exact coverage and line geometry, not calibrated physical depth. New coating/body protection classifications are estimates from TCGL opaque regions and their etch continuity. Existing reviewed SIR region PNGs are retained. No front brightness becomes height or normal.',
      'maps':{Path(path).name:digest(ROOT/'public'/path.lstrip('/')) for path in maps.values()},'holoFrontSha256':digest(front)}
    ep=OUT/(prefix+'evidence.json');ep.write_text(json.dumps(evidence,indent=2)+'\n')
    return {'cardId':printing['cardId'],'variant':variant,'profile':'prismatic_'+treatment,'textured':raw_etch is not None,
            'maps':maps,'evidence':'/cards/pokemon/prismatic-evolutions/tcgl/'+ep.name,'foilType':printing['foil']['type']}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--record-source-review',action='store_true');parser.add_argument('--number',action='append');args=parser.parse_args()
    OUT.mkdir(exist_ok=True)
    source=json.loads(SOURCE.read_text());records=[]
    selected=[]
    for index,printing in enumerate(source['printings']):
        printing['reviewPage']=index//18+1
        if not args.number or printing['number'] in args.number:selected.append(printing)
    def build(printing):
        result=convert(printing,args.record_source_review)
        print(printing['number']+' '+printing['variant']+' converted',flush=True)
        return result
    with ThreadPoolExecutor(max_workers=4) as pool:
        records=[record for record in pool.map(build,selected) if record]
    SOURCE.write_text(json.dumps(source,indent=2)+'\n')
    if not args.number:
        (OUT/'manifest.json').write_text(json.dumps(records,indent=2)+'\n')
        text='// Exact TCGL printings; generated offline by scripts/tcgl/convert_prismatic_set.py.\nimport type { CardMapPaths } from "../../card/CardDefinition.ts";\nexport interface TcglPrismaticSurface { cardId: string; variant: string; profile: string; textured: boolean; maps: CardMapPaths; evidence: string; foilType: string; }\nexport const tcglPrismaticSurfaces: readonly TcglPrismaticSurface[] = '+json.dumps(records,indent=2)+';\n'
        (ROOT/'src/pokemon/data/prismatic-surfaces.generated.ts').write_text(text)


if __name__=='__main__':main()
