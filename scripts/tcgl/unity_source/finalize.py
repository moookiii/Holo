"""Audit database coverage and make per-printing, lossless hard-linked PNG folders."""
import collections, json, os, shutil
from pathlib import Path
from pipeline import ROOT, CONFIG, dump, sha
from UnityPy.enums import TextureFormat

NAMES={'swsh1':'Sword & Shield','swsh2':'Rebel Clash','swsh3':'Darkness Ablaze','swsh3-5':"Champion’s Path",'swsh4':'Vivid Voltage','swsh4-5':'Shining Fates','swsh5':'Battle Styles','swsh6':'Chilling Reign','swsh7':'Evolving Skies','swsh7-5':'Celebrations','swsh7-5r':'Celebrations Classic Collection','swsh8':'Fusion Strike','swsh9':'Brilliant Stars','swsh9a':'Brilliant Stars Trainer Gallery','swsh10':'Astral Radiance','swsh10a':'Astral Radiance Trainer Gallery','swsh10-5':'Pokémon GO','swsh11':'Lost Origin','swsh11a':'Lost Origin Trainer Gallery','swsh12':'Silver Tempest','swsh12a':'Silver Tempest Trainer Gallery','swsh12-5':'Crown Zenith','swsh12-5a':'Crown Zenith Galarian Gallery','swshbsp':'Sword & Shield Black Star Promos','swshalt':'Sword & Shield alternate/special printings'}
def main():
    manifest=json.loads((ROOT/'dataset/manifest.json').read_text(encoding='utf-8'))
    records=json.loads((ROOT/'dataset/card-records.json').read_text(encoding='utf-8'))
    downloads=json.loads((ROOT/'dataset/download-results.json').read_text())
    downloaded={n:r for n,r in downloads.items() if r['status']=='downloaded'}
    for n,r in downloaded.items():
        raw=ROOT/'dataset/raw-bundles'/r['sha256']
        assert raw.exists() and sha(raw.read_bytes())==r['sha256'], 'Original bundle verification failed: '+n
    assert {r['card_id'] for r in manifest}=={r['card_id'] for r in records}
    assert len(manifest)==len(records)==len({r['card_id'] for r in manifest})
    source_by_hash={r['sha256']:r for r in downloads.values() if r['status']=='downloaded'}
    duplicates=collections.defaultdict(list); pixel_duplicates=collections.defaultdict(list); report={}; compendium={}
    for set_id in sorted({r['set_id'] for r in records}):
        path=CONFIG/(set_id+'-compendium_0.0.json'); expected={r['card_id'] for r in records if r['set_id']==set_id}
        if path.exists():
            raw=json.loads(path.read_text()); ids=set(json.loads(raw['keys']['compendium']['contentString']))
            compendium[set_id]={'sha256':sha(path.read_bytes()),'database_count':len(expected),'compendium_count':len(ids),'database_only':sorted(expected-ids),'compendium_only':sorted(ids-expected)}
            shutil.copyfile(path,ROOT/'dataset/databases'/path.name)
        else: compendium[set_id]={'status':'compendium_unavailable'}
    for row in manifest:
        report.setdefault(row['set_id'],{'name':NAMES.get(row['set_id'],row['set_id']),'printings':0,'assets':{k:collections.Counter() for k in row['assets']}})['printings']+=1
        for kind,asset in row['assets'].items():
            report[row['set_id']]['assets'][kind][asset['status']]+=1
            if asset.get('bundle_sha256') in source_by_hash: asset['bundle_source']=source_by_hash[asset['bundle_sha256']]['source']
            if asset['status']!='extracted': continue
            t=asset['texture']; t['format_name']=TextureFormat(t['format']).name; original=ROOT/t['png']; assert sha(original.read_bytes())==t['png_sha256']
            target=ROOT/'dataset/cards'/row['set_id']/row['card_id']/(kind+'.png'); target.parent.mkdir(parents=True,exist_ok=True)
            if not target.exists(): os.link(original,target)
            assert sha(target.read_bytes())==t['png_sha256']
            asset['file']=target.relative_to(ROOT).as_posix()
            duplicates[t['png_sha256']].append({'card_id':row['card_id'],'kind':kind,'reference':asset['reference'],'file':asset['file']})
            pixel_key=f"{t['width']}x{t['height']}:{t['mode']}:{t['decoded_pixel_sha256']}"
            pixel_duplicates[pixel_key].append({'card_id':row['card_id'],'kind':kind,'reference':asset['reference']})
    dump(ROOT/'dataset/manifest.json',manifest);dump(ROOT/'dataset/coverage.json',report)
    dump(ROOT/'dataset/duplicate-assets.json',{'identical_png':{k:v for k,v in duplicates.items() if len(v)>1},'identical_decoded_pixels':{k:v for k,v in pixel_duplicates.items() if len(v)>1}})
    dump(ROOT/'dataset/completeness-audit.json',{'database_manifest_ids_match':True,'compendiums':compendium,'bundle_download_failures':{k:v for k,v in downloads.items() if v['status']!='downloaded'},'unresolved_assets':[{'card_id':r['card_id'],'kind':k,**a} for r in manifest for k,a in r['assets'].items() if a['status'] not in ('extracted','not_applicable')]})
    missing_printings=sum(r['assets']['front']['status']!='extracted' for r in manifest)
    unresolved_total=sum(a['status'] not in ('extracted','not_applicable') for r in manifest for a in r['assets'].values())
    if len(downloaded)==len(downloads) and not unresolved_total:
        recovery=f'Complete recovery for this database snapshot: all {len(downloaded):,} required original bundles recovered and every printing texture reference resolved. The previously blocked requests succeeded on retry.'
    else:
        recovery=f'Partial recovery: {len(downloaded):,} original bundles recovered; {len(downloads)-len(downloaded):,} downloads failed. {missing_printings:,} printing records remain without recovered fronts; {unresolved_total:,} asset associations remain unresolved. Exact current errors are recorded in download-results.json and manifest.json. Historical HTTP 403 evidence is retained in evidence/cdn-recheck.json.'
    lines=['# Sword & Shield TCGL extraction coverage','',f'{len(manifest):,} printing records; {len(downloads):,} required original full-card bundles.','',recovery,'', '| Set | Printings | Front | Foil / white plate | Etch | Etch not applicable | Unresolved |','|---|---:|---:|---:|---:|---:|---:|']
    for s in NAMES:
        if s not in report: continue
        d=report[s]; a=d['assets']; unresolved=sum(n for k,c in a.items() for status,n in c.items() if status not in ('extracted','not_applicable'))
        lines.append(f"| {d['name']} ({s}) | {d['printings']} | {a['front'].get('extracted',0)} | {a['foil'].get('extracted',0)} | {a['etch'].get('extracted',0)} | {a['etch'].get('not_applicable',0)} | {unresolved} |")
    totals={k:sum(r['assets'][k].get('extracted',0) for r in report.values()) for k in ['front','foil','etch','cold_foil','cast_and_cure']}
    unresolved=sum(a['status'] not in ('extracted','not_applicable') for r in manifest for a in r['assets'].values())
    lines+=['',f'Extracted printing associations: {totals}. Unresolved asset associations: {unresolved}.','', 'Counts are printing associations, not unique texture files. Shared textures are associated only through exact material-manifest references. duplicate-assets.json groups identical bytes and pixels.','', 'Etch not applicable means the exact variant material manifest contains no etch reference. Unavailable, unresolved, and extraction_failed remain distinct statuses in manifest.json.','', 'Original Unity bundles, compressed serialized textures, native resolutions, decoded RGBA channels, and alpha are preserved. PNGs are lossless representations of decoded top-level mip data. Raw bundles retain original GPU compression and mip data. No cropping, color correction, rescaling, synthetic masks, normal generation, or foil baking was applied.','', 'Foil is the client white-plate mask (_w / _CardWhitePlateMask), not a newly inferred modern foil mask. Cold-foil and cast-and-cure references are tracked separately. Shader arithmetic and per-channel physical interpretation are not fully reverse-engineered; original channels are retained without claiming a physical height or measured depth.','', 'Completeness is relative to the installed English 1.43.0 database snapshot and its 14 active official manifests. It does not imply every historical or unreleased printing, or every language, is present in this client build.']
    (ROOT/'dataset/COVERAGE.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(json.dumps({'printings':len(manifest),'downloaded_bundles':len(downloaded),'blocked_bundles':len(downloads)-len(downloaded),'missing_printings':missing_printings,'extracted_associations':totals,'unresolved':unresolved,'compendium_differences':{s:a for s,a in compendium.items() if a.get('database_only') or a.get('compendium_only')}},indent=2))
if __name__=='__main__':main()
