"""Audit actual PNGs, master lineage, protected rails and stable regeneration."""
from pathlib import Path
import hashlib, json, subprocess, sys
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'public/cards/pokemon/expedition'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=json.loads((ROOT/'scripts/expedition/reverse-boundaries.json').read_text())
evidence=json.loads((BASE/'reverse-boundary-evidence.json').read_text())
assert len(rows)==len(evidence)==159
preserved={p:sha(p) for p in BASE.rglob('*.png') if not (p.parent.name=='maps' and (p.name.endswith('-reverse.png') or p.name=='40-legacy-reverse.png'))}
before={};report=[]
for row,record in zip(rows,evidence):
    assert row['cardId']==record['cardId']
    assert row['reviewStatus']=='reviewed-lower-boundary'
    assert sha(ROOT/row['front'])==row['frontSha256']==record['frontSha256']
    path=ROOT/record['mask'];before[path]=sha(path)
    assert before[path]==record['maskSha256']
    im=Image.open(path);assert im.mode=='L' and list(im.size)==record['maskSize']
    arr=np.array(im);seed=np.array(Image.open(ROOT/row['seed']).convert('L'))
    # Header/name maps remain exact, including the original Charizard resolution.
    height=int(378*im.height/825)
    assert np.array_equal(arr[:height],seed[:height]),row['cardId']
    assert arr[int(791*im.height/825):].max()==0,row['cardId']
    # Pokémon/Energy right outer rail, below the name header, is never foil.
    if row.get('category')!='Trainer':
        assert arr[int(430*im.height/825):,int(590*im.width/600):].max()==0,row['cardId']
    else:
        assert arr[450:625,560:].max()==0,row['cardId']
    report.append({'cardId':row['cardId'],'maskSha256':before[path],'masterUnchanged':True,'upperFoilUnchanged':True,'bottomRailOpaque':True})
subprocess.run([sys.executable,str(ROOT/'scripts/expedition/register-reverse-boundaries.py')],cwd=ROOT,check=True)
assert all(sha(p)==digest for p,digest in before.items()),'PNG regeneration must be byte-identical'
assert all(sha(p)==digest for p,digest in preserved.items()),'front/SAM/Cosmos assets must not change'
out=ROOT/'artifacts/expedition/reverse-boundaries/audit.json'
out.write_text(json.dumps({'cards':report,'stableRegeneration':True,'frontsSamCosmosUnchanged':True},indent=2)+'\n')
print('PASS: 159 exact masters, original headers, opaque reader rails, stable PNG regeneration; fronts/SAM/Cosmos unchanged.')
