"""Read-only TCGL local extraction. Sources are never modified. Resume by rerunning."""
from pathlib import Path
import argparse, base64, collections, concurrent.futures, hashlib, io, json, os, re, shutil, struct, sys
import UnityPy
from PIL import Image

ROOT=Path(__file__).resolve().parent
USER=Path.home()
INSTALL=USER/'The Pokémon Company International/Pokémon Trading Card Game Live/Pokemon TCG Live_Data'
CACHE=USER/'AppData/LocalLow/Unity/pokemon_Pokemon TCG Live'
CONFIG=USER/'AppData/LocalLow/pokemon/Pokemon TCG Live/config-cache'
def sha(data): return hashlib.sha256(data).hexdigest()
def dump(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix(path.suffix+'.tmp'); tmp.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8'); tmp.replace(path)
def safe(s): return re.sub(r'[^a-zA-Z0-9_.-]','_',str(s))

class Reader:
    def __init__(self,data): self.f=io.BytesIO(data)
    def take(self,n):
        b=self.f.read(n)
        if len(b)!=n: raise ValueError('Truncated database')
        return b
    def num(self,fmt): return struct.unpack('<'+fmt,self.take(struct.calcsize('<'+fmt)))[0]
    def string(self):
        n=0
        for shift in range(0,35,7):
            b=self.num('B'); n|=(b&127)<<shift
            if not b&128: return self.take(n).decode('utf-8')
        raise ValueError('Invalid string length')
    def val(self,t):
        marker=self.num('B')
        if marker in (1,2): return None
        if marker!=0: raise ValueError('Invalid value marker')
        if t=='System.String': return self.string()
        formats={'System.Boolean':'?','System.Byte':'B','System.SByte':'b','System.Int16':'h','System.UInt16':'H','System.Int32':'i','System.UInt32':'I','System.Int64':'q','System.UInt64':'Q','System.Double':'d','System.Single':'f','System.DateTime':'q','System.TimeSpan':'q','CardDatabase.DataAccess.CardCategory':'B'}
        if t in formats: return self.num(formats[t])
        raise ValueError('Unsupported database type '+t)
def database(p):
    raw=json.loads(p.read_text(encoding='utf-8')); b=base64.b64decode(raw['keys']['table']['contentBinary']); r=Reader(b)
    name=r.val('System.String'); cols=[(r.string(),r.string()) for _ in range(r.num('i'))]; count=r.num('i')
    rows=[{k:r.val(t) for k,t in cols} for _ in range(count)]
    if r.f.tell()!=len(b): raise ValueError('Unconsumed database bytes')
    return {'name':name,'row_count':count,'columns':cols,'rows':rows,'source':str(p),'sha256':sha(p.read_bytes()),'revision':raw['revision']}

def enumerate_cards():
    records=[]; sources=[]
    # Include all SWSH tables, plus any other table identifying SWSH series rows.
    for p in sorted(CONFIG.glob('card-database-*_en_*.json')):
        d=database(p)
        rows=[r for r in d['rows'] if str(r.get('seriesCode','')).upper()=='SWSH' or str(r.get('setCode','')).lower().startswith('swsh')]
        if not rows: continue
        target=ROOT/'dataset/databases'/p.name
        target.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(p,target)
        dump(ROOT/'dataset/databases'/('decoded-'+p.name),d)
        sources.append({k:v for k,v in d.items() if k!='rows'})
        for row in rows:
            code=d['name'].split('_')[0].lower(); number=int(row['EN Card #']); cid=row['cardID']; suffix=row.get('Variant Suffix') or ''
            # Exact client CardDataRowExtensions.GetImageAssetBundleName algorithm.
            if row['variant'] not in (0,1) and 'alt' in code: number=int(cid.rsplit('_',1)[-1])
            bundle=f'{code}_en_{number:03d}'
            mm='MaterialManifest'
            # Variant enum verified against the installed assembly; parallel holo is 1.
            if row['variant']==1: mm+='_ph'+suffix
            records.append({'card_id':cid,'long_form_id':row['longFormID'],'set_id':code,'printed_set_code':row['setCode'],'collector_number':row['EN Card #'],'printed_collector_number':row['CompSea Card Number'],'name':row['EN Card Name'],'variant':row['variant'],'variant_suffix':suffix,'foil_effect':row['Foil Effect'],'foil_mask':row['Foil Mask'],'bundle_name':bundle,'material_manifest':mm,'database':target.relative_to(ROOT).as_posix(),'row':row})
    ids=[r['card_id'] for r in records]
    if len(ids)!=len(set(ids)): raise ValueError('Duplicate card IDs across local tables')
    dump(ROOT/'dataset/card-records.json',records); dump(ROOT/'evidence/database-sources.json',sources)
    print('Enumerated',len(records),'printings in',len(sources),'tables',flush=True)
    return records

def extract_bundle(p):
    data=p.read_bytes(); digest=sha(data); checkpoint=ROOT/'dataset/checkpoints'/f'{digest}.json'
    if checkpoint.exists():
        previous=json.loads(checkpoint.read_text())
        if previous.get('status')=='ok' and all((ROOT/x['png']).exists() and sha((ROOT/x['png']).read_bytes())==x['png_sha256'] for x in previous['textures']): return previous
    result={'source':str(p),'sha256':digest,'bytes':len(data),'status':'ok','textures':[],'manifests':[],'containers':[],'bundle_names':[],'errors':[]}
    raw=ROOT/'dataset/raw-bundles'/digest
    raw.parent.mkdir(parents=True,exist_ok=True)
    if not raw.exists(): raw.write_bytes(data)
    result['raw_bundle']=raw.relative_to(ROOT).as_posix()
    try:
        env=UnityPy.load(str(p)); result['containers']=list(env.container)
        for o in env.objects:
            name=o.peek_name() or ''
            if o.type.name=='AssetBundle': result['bundle_names'].append(name.lower())
            if o.type.name=='Texture2D':
                try:
                    t=o.read(); img=t.image
                    out=ROOT/'dataset/textures'/digest/(safe(name)+'_'+str(o.path_id)+'.png'); out.parent.mkdir(parents=True,exist_ok=True)
                    img.save(out)
                    with Image.open(out) as checked: checked.load(); assert checked.size==img.size and checked.tobytes()==img.tobytes()
                    # Keep serialized object plus source bundle for original compression, mip levels and channels.
                    obj=out.with_suffix('.serialized'); obj.write_bytes(o.get_raw_data())
                    result['textures'].append({'name':name,'path_id':o.path_id,'serialized_file':o.assets_file.name,'width':t.m_Width,'height':t.m_Height,'format':int(t.m_TextureFormat),'mode':img.mode,'png':out.relative_to(ROOT).as_posix(),'png_sha256':sha(out.read_bytes()),'decoded_pixel_sha256':sha(img.tobytes()),'serialized':obj.relative_to(ROOT).as_posix(),'serialized_sha256':sha(obj.read_bytes()),'orientation':'UnityPy default vertical conversion; no extra flip','conversion':'Lossless PNG of decoder output; compressed original retained in raw bundle'})
                except Exception as e: result['errors'].append({'name':name,'type':'texture_decode_failed','reason':str(e)})
            elif o.type.name=='MonoBehaviour' and 'materialmanifest' in name.lower():
                try: tree=o.read_typetree(); result['manifests'].append({'name':name,'path_id':o.path_id,'tree':tree})
                except Exception as e: result['errors'].append({'name':name,'type':'manifest_decode_failed','reason':str(e)})
        if result['errors']: result['status']='partial'
    except Exception as e: result['status']='failed'; result['errors'].append({'type':'bundle_decode_failed','reason':str(e)})
    dump(checkpoint,result)
    return result

def run(workers):
    records=enumerate_cards(); names={r['bundle_name'] for r in records}
    download_path=ROOT/'dataset/download-results.json'
    downloads=json.loads(download_path.read_text()) if download_path.exists() else {}
    paths=[]; inventory=[]
    for root in [INSTALL,CACHE,USER/'AppData/LocalLow/pokemon/Pokemon TCG Live',ROOT/'incoming']:
        if not root.exists(): continue
        for p in sorted(root.rglob('*')):
            if not p.is_file(): continue
            inventory.append({'path':str(p),'bytes':p.stat().st_size})
            if p.name=='__data' or p.suffix in ('.assets','.bundle'):
                paths.append(p)
    dump(ROOT/'evidence/file-inventory.json',inventory)
    # Inspect all Unity sources to catch cards whose cache directory differs from the bundle name.
    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        for i,result in enumerate(pool.map(extract_bundle,paths),1):
            results.append(result)
            if i%25==0: print('Inspected',i,'/',len(paths),flush=True)
    dump(ROOT/'dataset/bundle-index.json',results)
    by_name=collections.defaultdict(list)
    for b in results:
        for n in b.get('bundle_names',[]):
            if n in names: by_name[n].append(b)
        for c in b['containers']:
            for n in re.findall(r'swsh[a-z0-9-]*_en_\d+',c.lower()):
                if n in names: by_name[n].append(b)
        for t in b['textures']:
            if t['name'].lower() in names: by_name[t['name'].lower()].append(b)
        if Path(b['source']).name=='__data':
            n=Path(b['source']).parents[1].name.lower()
            if n in names: by_name[n].append(b)
    manifest=[]
    for r in records:
        bs=list({b['sha256']:b for b in by_name[r['bundle_name']]}.values()); entry={k:v for k,v in r.items() if k!='row'}; assets={}
        matches=[(b,m) for b in bs for m in b['manifests'] if m['name']==r['material_manifest']]
        entry['material_manifest_requested']=r['material_manifest']
        entry['material_manifest_selection']='exact_name'
        # Installed MaterialManager.GetCardManifest falls back to the first available
        # material manifest when the requested default name is absent. Accept this
        # only when the exact card bundle contains ONE manifest, never guess among variants.
        if not matches and len(bs)==1 and len(bs[0]['manifests'])==1:
            matches=[(bs[0],bs[0]['manifests'][0])]
            entry['material_manifest']=matches[0][1]['name']
            entry['material_manifest_selection']='client_single_manifest_fallback'
        for kind,field in [('front','_c'),('foil','_w'),('etch','_e'),('cold_foil','_cf'),('cast_and_cure','_cc')]:
            if len(matches)!=1:
                download=downloads.get(r['bundle_name'],{})
                reason=download.get('reason','Card bundle absent from inspected local sources; normal client download required') if not bs else f'Expected one exact material manifest; found {len(matches)}'
                assets[kind]={'status':'unavailable' if not bs else 'unresolved','reason':reason,'bundle_source':download.get('source'),'candidate_bundles':[b['sha256'] for b in bs]}; continue
            b,m=matches[0]; ref=m['tree'].get(field,'')
            if not ref and kind=='front': ref=r['bundle_name']
            if not ref:
                assets[kind]={'status':'not_applicable','reason':'Exact material manifest has empty texture reference','manifest':m['name'],'field':field,'bundle_sha256':b['sha256']}; continue
            ts=[t for t in b['textures'] if t['name'].lower()==Path(ref).stem.lower() or t['name'].lower()==ref.lower()]
            assets[kind]={'status':'extracted' if len(ts)==1 else 'extraction_failed','reference':ref,'field':field,'manifest':m['name'],'bundle_sha256':b['sha256'],'texture':ts[0] if len(ts)==1 else None,'reason':None if len(ts)==1 else f'Expected one texture for exact manifest reference; decoded matches={len(ts)}'}
        entry['assets']=assets; manifest.append(entry)
    dump(ROOT/'dataset/manifest.json',manifest)
    report={}
    for r in manifest:
        s=report.setdefault(r['set_id'],{'printings':0,'assets':{k:collections.Counter() for k in r['assets']}}); s['printings']+=1
        for k,a in r['assets'].items(): s['assets'][k][a['status']]+=1
    dump(ROOT/'dataset/coverage.json',report)
    lines=['# Local TCGL Sword & Shield coverage','',f'Printings: {len(manifest)}. Source Unity files inspected: {len(results)}.','', '| Set | Printings | Front | Foil | Etch |','|---|---:|---:|---:|---:|']
    for s,d in sorted(report.items()): lines.append(f"| {s} | {d['printings']} | {d['assets']['front'].get('extracted',0)} | {d['assets']['foil'].get('extracted',0)} | {d['assets']['etch'].get('extracted',0)} |")
    lines+=['','Counts are printing associations, not unique files. Every missing association and exact reason is in manifest.json. Empty database Foil Mask values alone do not prove texture absence. Only empty exact material references establish not-applicable.','', 'This is an inventory of accessible local assets, not a claim of full-series extraction.']
    (ROOT/'dataset/COVERAGE.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(json.dumps(report),flush=True)

if __name__=='__main__':
    a=argparse.ArgumentParser(); a.add_argument('--workers',type=int,default=2); args=a.parse_args(); run(args.workers)
