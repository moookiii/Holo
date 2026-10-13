"""Rasterize hand registrations; reuse each printing's exact TCGL plate.

No relief, runtime image detection, random positions, printed-brightness masks,
new optical renderer or edits to existing Cosmos/Base Set treatments.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((Path(__file__).parent / 'placements.json').read_text())
REFS = {r['cardId']: r for r in json.loads((ROOT / 'research/evolutions/references.json').read_text())}
SIZE = (1200,1650)
OUT = ROOT / 'public/cards/pokemon/evolutions-holo'
REVIEW = ROOT / 'artifacts/evolutions/registration'

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def public(p): return '/' + p.relative_to(ROOT/'public').as_posix()
def save(p, v): Image.fromarray(np.rint(np.clip(v,0,1)*255).astype(np.uint8)).save(p,optimize=True)

def main():
    REVIEW.mkdir(parents=True,exist_ok=True)
    yy,xx = np.mgrid[:3300,:2400].astype(np.float32)
    xx=(xx+.5)/4; yy=(yy+.5)/4
    report=[]
    for cid, card in DATA['cards'].items():
        number=cid.split('-')[1]
        source=ROOT / f'public/cards/pokemon/tcgl-xy/xy12_{number}'
        evidence=json.loads((source/'evidence.json').read_text(encoding='utf-8'))
        assert evidence['tcglVariantId'].endswith('_std_RareHolo_Galaxy_Holo'),cid
        folder=OUT/cid; folder.mkdir(parents=True,exist_ok=True)
        dots=np.zeros(xx.shape,np.float32); stars=np.zeros_like(dots)
        for x,y,r in card['dots']:
            assert 0<x<600 and 0<y<825 and r>0
            dots=np.maximum(dots,((xx-x)**2+(yy-y)**2<=r*r).astype(np.float32))
        for x,y,rx,ry,rays in card['stars']:
            a,b=(xx-x)/rx,(yy-y)/ry
            # Established Base Set eight-ray rasterization with narrower arms
            # and compact core; four-ray flashes are explicitly recorded.
            distance=np.minimum(abs(a)+abs(b)/.12,abs(a)/.12+abs(b))
            if rays==8:
                da,db=(a+b)/2**.5,(b-a)/2**.5
                distance=np.minimum(distance,np.minimum(abs(da)/.66+abs(db)/.12,abs(da)/.12+abs(db)/.66))
            else: assert rays==4
            distance=np.minimum(distance,np.hypot(a,b)/.17)
            stars=np.maximum(stars,(distance<=1).astype(np.float32))
        for name,array in [('dots',dots),('stars',stars)]:
            Image.fromarray(np.uint8(array*255)).resize(SIZE,Image.Resampling.LANCZOS).save(folder/f'{name}.png',optimize=True)
        # Identical UV registration to the paired existing clean front.
        raw=Image.open(source/'original-foil.png').convert('RGBA'); w,h=raw.size
        controls=raw.resize(SIZE,Image.Resampling.BILINEAR,box=(145/1024*w,0,878/1024*w,h))
        controls.save(folder/'foil-controls.png',optimize=True)
        native=np.asarray(controls.convert('L'),np.float32)/255
        # Reviewed inner picture rails in each full-front master. All thirteen
        # use the same retro layout; retain the native plate inside those rails.
        # This removes only decoded compression residue in titles/rules/borders.
        window=Image.new('L',SIZE,0)
        ImageDraw.Draw(window).rectangle((134,234,1059,871),fill=255)
        window.save(folder/'window.png',optimize=True)
        plate=native*np.asarray(window,np.float32)/255
        # The native whiteplate carries its own artwork/subject/print boundary.
        # Keep motifs complete behind print and compose the clipping separately.
        save(folder/'foil.png',plate)
        star=np.asarray(Image.open(folder/'stars.png'),np.float32)/255
        save(folder/'star-foil.png',plate*star)
        maps={'foil':public(folder/'foil.png'),'foilControls':public(folder/'foil-controls.png'),
              'motif':public(folder/'dots.png'),'secondaryFoil':public(folder/'star-foil.png'),
              'secondaryMotif':public(folder/'stars.png')}
        master=ROOT/REFS[cid]['registration']['master']
        review=Image.open(master).convert('RGB').resize(SIZE)
        # Full-front boundary overlays, with protection applied during display.
        for name,color in [('dots',(0,245,255)),('stars',(255,50,190))]:
            motif=Image.open(folder/f'{name}.png')
            edge=np.asarray(motif.filter(ImageFilter.MaxFilter(3)),np.float32)/255 - np.asarray(motif.filter(ImageFilter.MinFilter(3)),np.float32)/255
            edge=Image.fromarray(np.uint8(np.clip(edge*plate,0,1)*255))
            review=Image.composite(Image.new('RGB',SIZE,color),review,edge)
        review.save(REVIEW/f'{cid}-boundaries.png')
        physical=Image.open(ROOT/f'research/evolutions/{cid}/registered.png').convert('RGB').resize(SIZE)
        draw=ImageDraw.Draw(physical)
        for i,(x,y,r) in enumerate(card['dots']):
            draw.ellipse(((x-r)*2,(y-r)*2,(x+r)*2,(y+r)*2),outline='cyan',width=1)
            draw.text((x*2+r*2+2,y*2),f'd{i+1}',fill='cyan')
        for i,(x,y,rx,ry,_) in enumerate(card['stars']):
            draw.rectangle(((x-rx)*2,(y-ry)*2,(x+rx)*2,(y+ry)*2),outline=(255,60,210),width=1)
            draw.text((x*2+rx*2+2,y*2),f's{i+1}',fill=(255,60,210))
        physical.save(REVIEW/f'{cid}-physical-overlay.png')
        pixels=np.argwhere(plate>.02)
        record={'cardId':cid,'name':card['name'],'tcglCardId':evidence['tcglCardId'],
                'tcglVariantId':evidence['tcglVariantId'],'profile':'pokemon-evolutions-holo',
                'coordinateDimensions':DATA['coordinateDimensions'],'outputDimensions':list(SIZE),
                'registration':evidence['registration'], 'maps':maps,
                'artworkCoverageBoundsPixels':[int(pixels[:,1].min()),int(pixels[:,0].min()),int(pixels[:,1].max()+1),int(pixels[:,0].max()+1)],
                'sourceEvidence':public(source/'evidence.json'),
                'window':{'fullFrontBounds':[67,117,530,436],'png':public(folder/'window.png'),'sha256':sha(folder/'window.png'),
                          'review':'Inner artwork rails compared on all thirteen unchanged clean fronts; native subject/opaque exclusions preserved within the window.'},
                'preservedSources':{'front':{'path':REFS[cid]['registration']['master'],'sha256':sha(master)},
                                    'originalFront':{'path':public(source/'original-front.png'),'sha256':sha(source/'original-front.png')},
                                    'originalFoil':{'path':public(source/'original-foil.png'),'sha256':sha(source/'original-foil.png')}},
                'physicalReference':REFS[cid], 'placementMethod':DATA['method'],
                'dots':card['dots'],'stars':card['stars'],'uncertainty':card['uncertainty'],
                'starShape':{'basis':'scripts/wotc/create-star-maps.py','armWidth':.12,'diagonalReach':.66,'coreRadius':.17,'supersampling':4},
                'hashes':{k:sha(ROOT/'public'/p.lstrip('/')) for k,p in maps.items()},
                'normalGeneration':False,'existingOpticsChanged':False,'referenceStatus':'single-photo; moving physical reference desired'}
        (folder/'evidence.json').write_text(json.dumps(record,indent=2)+'\n')
        report.append({k:record[k] for k in ('cardId','name','tcglVariantId','uncertainty','hashes')})
        print(cid, len(card['dots']),len(card['stars']),record['artworkCoverageBoundsPixels'],flush=True)
    (OUT/'manifest.json').write_text(json.dumps({'profile':'pokemon-evolutions-holo','printings':report},indent=2)+'\n')

if __name__=='__main__': main()
