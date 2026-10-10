"""Verify every imported PNG, record output hashes, share identical map URLs."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
import hashlib,json,sys
sys.path.insert(0,str(Path(__file__).parent))
from audit_swsh import read_export
ROOT=Path(__file__).resolve().parents[2]
def main():
    target=ROOT/'src/pokemon/data/swsh-tcgl.generated.ts';lines=target.read_text(encoding='utf-8').splitlines();sets=read_export(lines[3]);surfaces=read_export(lines[4])
    urls={v for s in surfaces for v in s['maps'].values() if isinstance(v,str)}
    urls.update(s['assets']+'/'+front for s in sets for c in s['cards'] for front in c['variantFronts'].values())
    def inspect(url):
        p=ROOT/'public'/url.lstrip('/');sha=hashlib.sha256(p.read_bytes()).hexdigest()
        with Image.open(p) as im:
            size=list(im.size);mode=im.mode;im.verify()
        if url.endswith('/normal.png') and size!=[1800,2475]:raise ValueError('Invalid normal '+url)
        return url,{'sha256':sha,'dimensions':size,'mode':mode}
    records=dict(ThreadPoolExecutor(6).map(inspect,sorted(urls)))
    byHash={};reused=0
    for surface in surfaces:
        for channel,url in surface['maps'].items():
            key=(channel,records[url]['sha256']);canonical=byHash.setdefault(key,url)
            if canonical!=url:surface['maps'][channel]=canonical;reused+=1
        evidence=ROOT/'public'/surface['evidence'].lstrip('/')
        data=json.loads(evidence.read_text());data['maps']=surface['maps'];data['outputVerification']={channel:records[url] for channel,url in surface['maps'].items()};evidence.write_text(json.dumps(data,indent=2)+'\n')
    lines[4]=lines[4].split(' = ',1)[0]+' = JSON.parse('+json.dumps(json.dumps(surfaces,ensure_ascii=False),ensure_ascii=False)+');'
    target.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    report={'verifiedPngs':len(records),'reusedMapReferences':reused,'printings':len(surfaces),'assets':records}
    (ROOT/'public/cards/pokemon/tcgl-swsh/asset-validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(len(records),'verified PNGs;',reused,'identical map references shared')
if __name__=='__main__':main()
