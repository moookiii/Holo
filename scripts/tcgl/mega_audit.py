"""Targeted source/output audit and durable per-card provenance for new batches."""
import argparse,json,hashlib
from pathlib import Path
from collections import Counter
from PIL import Image
from mega_series import ROOT,SETS,write

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--sets',nargs='+',default=[s[0] for s in SETS[:6]]);args=parser.parse_args()
    summary=[]
    for sid,key,_,_ in SETS:
        if sid not in args.sets:continue
        archive=ROOT/f'research/tcgl/mega-series/{key}'
        source=json.loads((archive/'sources.json').read_text());printings=source['printings']
        manifest=json.loads((ROOT/f'public/cards/pokemon/tcgl-me/{sid}/tcgl/manifest.json').read_text())
        surfaces={(s['cardId'],s['variant']):s for s in manifest}
        originals={};cards={};duplicates=[]
        for p in printings:
            cards.setdefault(p['cardId'],[]).append(p)
            for s in p['sources'].values():
                if s['file'] in originals:continue
                path=ROOT/s['file'];sha=hashlib.sha256(path.read_bytes()).hexdigest()
                if sha!=s['sha256']:raise ValueError('Source hash changed: '+s['file'])
                with Image.open(path) as im:
                    im.load()
                    if list(im.size)!=s['dimensions']:raise ValueError('Source dimensions changed')
                originals[s['file']]=s
            if not p['foil']:continue
            surface=surfaces[(p['cardId'],p['variant'])]
            evidence=json.loads((ROOT/'public'/surface['evidence'].lstrip('/')).read_text())
            if evidence['tcglVariantId']!=p['tcglVariantId'] or evidence['sources']!=p['sources']:raise ValueError('Wrong exact pairing')
            for name,sha in evidence['maps'].items():
                path=ROOT/f'public/cards/pokemon/tcgl-me/{sid}/tcgl/{name}'
                if hashlib.sha256(path.read_bytes()).hexdigest()!=sha:raise ValueError('Output hash changed')
            if surface['textured'] and ('normal' not in surface['maps'] or evidence['embossStrength']!=0):raise ValueError('Missing authored normal')
        for card,records in cards.items():
            write(ROOT/f'research/tcgl/{card}/source.json',{'cardId':card,'printings':records})
            variants={p['variant']:p for p in records}
            if 'special-reverse' in variants and variants['special-reverse']['sources']['foil']['sha256']==variants['reverse']['sources']['foil']['sha256']:
                duplicates.append({'cardId':card,'name':records[0]['name'],'phUrl':variants['reverse']['sources']['foil']['url'],'ph2Url':variants['special-reverse']['sources']['foil']['url'],'sha256':variants['reverse']['sources']['foil']['sha256']})
        row={'setId':sid,'cards':len(cards),'printings':len(printings),'surfaces':len(surfaces),'originalAssets':len(originals),'etchedNormals':sum(s['textured'] for s in manifest),
             'rarities':dict(Counter(p['rarity'] for p in printings if p['suffix']=='std')),'reservedOptics':sum(s.get('treatmentStatus')=='deferred' for s in manifest),
             'passed':True,'identicalSpecialReversePairs':duplicates}
        write(archive/'batch-validation.json',row);summary.append(row)
        print(f"{sid}: {row['cards']} cards / {row['printings']} printings / {row['etchedNormals']} normals verified; {len(duplicates)} identical ph/ph2 pairs",flush=True)
    write(ROOT/'artifacts/mega-series/batch-validation.json',summary)

if __name__=='__main__':main()
