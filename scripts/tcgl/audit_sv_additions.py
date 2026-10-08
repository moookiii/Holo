"""Verify preserved TCGL bytes and every added offline PNG; record finish gaps."""
from concurrent.futures import ThreadPoolExecutor
from collections import Counter
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image
from fetch_sv_additions import ROOT,PRODUCTS

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def audit(p):
    base=ROOT/f'public/cards/pokemon/tcgl-sv/{p["cardId"].split("-")[0]}'
    assert digest(base/p['frontFile'])==p['sources']['front']['sha256'],p['cardId']
    for s in p['sources'].values(): assert digest(ROOT/s['file'])==s['sha256'],s['file']
    if 'foil' not in p['sources']: return
    evidence=json.loads((base/'tcgl'/f'{p["number"]}-{p["variant"]}-evidence.json').read_text(encoding='utf-8'))
    for name,sha in evidence['maps'].items():
        path=base/'tcgl'/name
        assert digest(path)==sha,str(path)
        with Image.open(path) as im: assert list(im.size)==evidence['mapDimensions'][name],str(path)
    if 'etch' in p['sources']:
        stem=f'{p["number"]}-{p["variant"]}-'
        with Image.open(base/'tcgl'/(stem+'normal.png')) as im:
            assert im.mode=='RGB' and im.size==(1800,2475)
            normal=np.asarray(im)
        with Image.open(base/'tcgl'/(stem+'protection.png')) as im: protection=np.asarray(im)
        assert np.all(normal[protection==255]==[128,128,255]),p['cardId']
        assert normal[...,2].min()>=128,p['cardId']
        assert evidence['normalScale']==1 and evidence['embossStrength']==0
        assert not (base/'tcgl'/(stem+'height.png')).exists()
    if p['foil']['type']=='COSMOS':
        with Image.open(base/'tcgl'/f'{p["number"]}-{p["variant"]}-motif.png') as im:
            assert im.size==(1200,1650) and im.getextrema()==(0,0)

def main():
    all_printings=[];sets=[];gaps={key:[] for key in ['cast-and-cure-pokeball','cast-and-cure-masterball','black-white-rare','cosmos-placement']}
    for set_id,(_,name,date) in PRODUCTS.items():
        source=json.loads((ROOT/f'research/tcgl/{set_id}-set/sources.json').read_text(encoding='utf-8'))
        ps=source['printings'];all_printings.extend(ps)
        sets.append({'id':set_id,'name':name,'releaseDate':date,'cards':len({p['cardId'] for p in ps}),'printings':len(ps),
                     'foilPrintings':sum('foil' in p['sources'] for p in ps),'etchedPrintings':sum('etch' in p['sources'] for p in ps),
                     'exports':source['exportSources']})
        for p in ps:
            kind='cast-and-cure-pokeball' if '_CastAndCure_SVPokeBall' in p['tcglVariantId'] else 'cast-and-cure-masterball' if '_CastAndCure_SVMasterBall' in p['tcglVariantId'] else 'black-white-rare' if p['rarity']=='Black White Rare' else 'cosmos-placement' if p['foil'] and p['foil']['type']=='COSMOS' else None
            if kind:gaps[kind].append({'cardId':p['cardId'],'name':p['name'],'variant':p['variant'],'tcglVariantId':p['tcglVariantId']})
    with ThreadPoolExecutor(max_workers=4) as pool: list(pool.map(audit,all_printings))
    report={'status':'passed','sets':sets,'cards':sum(s['cards'] for s in sets),'printings':len(all_printings),
            'foilPrintings':sum(s['foilPrintings'] for s in sets),'etchedPrintings':sum(s['etchedPrintings'] for s in sets),
            'sourceDimensions':{kind:dict(Counter('x'.join(map(str,p['sources'][kind]['dimensions'])) for p in all_printings if kind in p['sources'])) for kind in ('front','foil','etch')},'normalDimensions':[1800,2475],
            'normalConversion':{'polarity':'1 - mean RGB','resize':'full-domain bilinear','crop':None,'flip':False,'offset':[0,0],
                'derivative':'OpenCV Scharr CV_32F scale 1/32 before protection','slopeGain':1.03,'encoding':'opaque RGB OpenGL +Y','activeHeightEmboss':False},
            'integrity':'All source/front/output SHA-256 hashes and PNG dimensions passed. All fully protected normal pixels are (128,128,255). Cosmos motifs are empty PNGs.',
            'newShadersAdded':0,'missingShaderFamilies':2,'missingFinishCounts':{k:len(v) for k,v in gaps.items()},'pending':gaps,
            'visualReview':'Source-family sheets inspected. Sampled live render review is separate; individual high-zoom/angled-photo validation remains pending for unsampled cards.',
            'packOpening':'Catalog/gallery additions only. No invented pack odds or non-TCGL wrapper art; these added products remain browse-only.'}
    (ROOT/'public/cards/pokemon/tcgl-sv/additions-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ('sets','pending','normalConversion')},indent=2),flush=True)

if __name__=='__main__': main()
