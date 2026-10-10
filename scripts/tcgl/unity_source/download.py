"""Fetch only unauthenticated original TCGL bundles named by client manifests."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import argparse, json, threading, time, requests, UnityPy
from pipeline import ROOT, CONFIG, dump, sha, enumerate_cards, extract_bundle
LOCAL=threading.local()
def fetch(url):
    if not hasattr(LOCAL,'session'): LOCAL.session=requests.Session()
    for attempt in range(3):
        try:
            response=LOCAL.session.get(url,timeout=(15,60))
            # Never retry an access-control rejection or use credentials to work around it.
            if response.status_code in (401,403,404): response.raise_for_status()
            response.raise_for_status(); return response.content
        except requests.RequestException as e:
            if getattr(e,'response',None) is not None and e.response.status_code in (401,403,404): raise
            if attempt==2: raise
            time.sleep(2**attempt)
def main(workers):
    records=enumerate_cards(); settings=json.loads((ROOT/'evidence/game-settings.json').read_bytes())
    base=settings['data']['windowsplayer_contentpath']; manifest_source=CONFIG/'asset-bundle-manifest_0.0.json'
    dates=json.loads(json.loads(manifest_source.read_text())['keys']['manifest']['contentString'])['directories']
    index={}; sources=[]
    for date in dates:
        url=base+date+'/manifest_en_'+date; path=ROOT/'evidence/manifests'/('manifest_en_'+date)
        if not path.exists():
            path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(fetch(url))
        env=UnityPy.load(str(path)); tree=next(o.read_typetree() for o in env.objects if o.type.name=='MonoBehaviour')
        dump(path.with_suffix('.json'),tree)
        manifest_hash=sha(path.read_bytes())
        sources.append({'url':url,'sha256':manifest_hash,'path':path.relative_to(ROOT).as_posix()})
        for asset in tree['assetList']:
            # Installed AssetBundleObject(baseUrl, asset) construction, in ordered bucket precedence.
            folder=asset.get('s3Folder','').replace('0.0/','')
            index[asset['assetName'].lower()]={'url':base+date+'/'+folder+asset['assetName'],'manifest_url':url,'manifest_sha256':manifest_hash,**asset}
    dump(ROOT/'evidence/remote-manifests.json',sources)
    names=sorted({r['bundle_name'] for r in records}); selected={n:index[n] for n in names if n in index}
    dump(ROOT/'dataset/download-plan.json',{'bundles':selected,'missing_from_remote_manifests':sorted(set(names)-set(selected))})
    print(f'Official manifests: {len(index)} bundles. Required: {len(names)}. Found: {len(selected)}.',flush=True)
    result_path=ROOT/'dataset/download-results.json'; results=json.loads(result_path.read_text()) if result_path.exists() else {}
    def worker(item):
        n,a=item; path=ROOT/'incoming'/(n+'.bundle'); prior=results.get(n)
        if prior and prior.get('status')=='downloaded' and path.exists() and sha(path.read_bytes())==prior['sha256']:
            return n,prior
        try:
            data=fetch(a['url'])
            if not data.startswith(b'UnityFS\0'): raise ValueError('Expected UnityFS bundle signature')
            tmp=path.with_suffix('.download'); tmp.parent.mkdir(parents=True,exist_ok=True); tmp.write_bytes(data); tmp.replace(path)
            extracted=extract_bundle(path)
            return n,{'status':'downloaded','sha256':sha(data),'bytes':len(data),'file':path.relative_to(ROOT).as_posix(),'source':a,'decode_status':extracted['status']}
        except Exception as e: return n,{'status':'download_failed','reason':str(e),'source':a}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for count,f in enumerate(as_completed([pool.submit(worker,x) for x in selected.items()]),1):
            n,r=f.result(); results[n]=r
            if count%25==0 or count==len(selected):
                dump(result_path,results); print(f'{count}/{len(selected)} processed; failures={sum(x["status"]!="downloaded" for x in results.values())}',flush=True)
    dump(result_path,results)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--workers',type=int,default=8);a=p.parse_args();main(a.workers)
