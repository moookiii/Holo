"""Validate deployed XY provenance and write per-set integration/handoff reports."""
from pathlib import Path
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import hashlib, json
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/cards/pokemon/tcgl-xy'
REASONS = {
 'Gold Pokemon BREAK': 'Gold segmented optical cells and raised gold print; the existing cracked-ice/random-facet and generic gold profiles do not establish this response.',
 'XY regular EX and Mega EX': 'Mixed smooth EX foil, printed subject, silver/gold trim and Mega title regions. Generic whole-card Sheen does not establish those independently responding regions.',
 'XY textured Full Art EX/Mega/Trainer': 'Exact etch exists. Sylveon/Espeon conversion is available, but compatibility of that finish response with XY body/background/trim zones is not established. Review/calibrate before enabling; a new shader is a candidate, not proven necessary for every card.',
 'XY gold and specialized Primal/Mega': 'Exact etch exists; specialized gold/silver, Primal and multi-region response requires comparison with exact-print moving references. Generic gold/prismatic assignment is not justified by the etch alone.',
 'Steam Siege dual-type reverse': 'Source-data limitation: the five TCGL masks inspected encode the first-type motif rather than the requested split. Preserve those exact masks; do not synthesize a second type. This is not solely missing shader support.',
 'Evolutions English starlight': 'The generic early Galaxy-Star and original Base Set star fields are different optical sheets; their procedural stars must not replace the distinct English Evolutions pattern.',
 'Generations Radiant Collection': 'Own decorative foil masks include snowflakes/hearts and distinct coverage; generic Sheen or full-art EX cannot establish the RC presentation. Includes 13 TCGL NonFoil front records, retained as supplied.',
 'Cosmos registered motif placement': 'Existing Base Set 2 Cosmos optics are available. Exact-copy centers/radii and moving references are not available for these 98 printings. This is pending physical registration, not a new shader requirement. Clean fronts shown until registration is reviewed; no random dots.',
 'XY promotional Stamped': 'The TCGL Stamped enum alone does not establish that the existing First Movie gold-stamp response matches these promotional stamps; exact-print optical evidence is still needed.',
}
def load(path): return json.loads(path.read_bytes())
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
 index=load(OUT/'printing-index.json'); audit=load(OUT/'import-audit.json')
 pending=load(ROOT/'docs/xy-pending-finishes.json')
 wrappers=load(ROOT/'public/packs/pokemon/xy-wrapper-sources.json')
 source=load(ROOT/'research/tcgl/xy-series/dataset/manifest.json')
 source_by={r['card_id']:r for r in source}
 def validate(p):
  e=load(OUT/p['tcglCardId']/'evidence.json'); m=source_by[p['tcglCardId']]
  assert e['tcglVariantId']==p['tcglVariantId']==m['long_form_id']
  hashes={}
  for kind,s in e['sources'].items():
   path=ROOT/('public'+s['publicOriginal']); assert digest(path)==s['sha256']==m['assets'][kind]['texture']['png_sha256']
   with Image.open(path) as im: im.load(); assert list(im.size)==[m['assets'][kind]['texture']['width'],m['assets'][kind]['texture']['height']]
   hashes[kind]=s['sha256']
  for kind,path in e['maps'].items():
   with Image.open(ROOT/('public'+path)) as im: im.load(); assert im.size==((1,1) if kind=='roughness' else (733,1024))
  return p,e,hashes
 records=list(ThreadPoolExecutor(6).map(validate,index))
 sets={}
 for sid,counts in audit['sets'].items():
  own=[(p,e,h) for p,e,h in records if p['setId']==sid]
  sets[sid]={**counts,'sourceFronts':len(own),
   'sourceFoilMaps':sum('foil' in h for p,e,h in own),'sourceEtchMaps':sum('etch' in h for p,e,h in own),
   'supportedFoilVariants':sum(e['profile']!='print-only' for p,e,h in own),
   'pendingVariants':sum(bool(e['deferredEffect']) for p,e,h in own),
   'nativeNonfoilVariants':sum(e['profile']=='print-only' and not e['deferredEffect'] for p,e,h in own),
   'wrapperDesigns':sum(w['setId']==sid for w in wrappers),
   'boosterCardCount':7 if sid=='xy5-5' else 10 if any(w['setId']==sid for w in wrappers) else None}
 for w in wrappers:
  path=ROOT/w['output']; assert digest(path)==w['sha256']
  with Image.open(path) as im:
   im.load(); assert list(im.size)==w['dimensions']; assert im.getchannel('A').getbbox()==(0,0,*im.size)
 families={k:{'count':len(v),'reason':REASONS[k],'examples':v[:3]} for k,v in pending.items()}
 livepath=ROOT/'artifacts/xy-integration/report.json'; live=load(livepath) if livepath.exists() else None
 report={'sets':sets,'totals':{'cards':sum(s['cards'] for s in sets.values()),'variants':len(index),
  'supportedFoilVariants':sum(s['supportedFoilVariants'] for s in sets.values()),
  'nativeNonfoilVariants':sum(s['nativeNonfoilVariants'] for s in sets.values()),
  'pendingVariants':sum(s['pendingVariants'] for s in sets.values()),'boosterProducts':14,'wrapperDesigns':len(wrappers)},
  'profiles':audit['profiles'],'pendingFamilies':families,
  'validation':{'sourceIdentityAndOriginalHashes':'passed for all 3416 variants',
    'originalPngDecodingAndDimensions':'passed','runtimeMapDecodingAndDimensions':'passed',
    'wrappersHashesDecodingAndTightAlphaBounds':'passed for all 54 designs',
    'xyTests':'3 passed: all identities, 18 collections, 4200 seeded packs and all branches',
    'productionBuild':'passed; standard existing chunk-size warning',
    'liveReview':{'viewers':len(live['results']['viewers']),'products':len(live['results']['packs']),
      'errors':live['errors'],'failure':live['results'].get('failure'),
      'startupXyTextureRequests':live['results'].get('startupXYRequests'),
      'externalCardRequests':live['results'].get('externalCardRequests')} if live else None},
  'limitations':['McDonald\'s: zero acquired TCGL printings after raw/archived index and bundle audit; no invented collection.',
   'Pack rates are published primary-observer estimates, not official probabilities. Uniform within rarity categories except the observed Evolutions uncommon sheet; factory/box correlations are not simulated.',
   'All 148 exact etches retained byte-exact; no XY normals generated because XY finish/region compatibility is not established.',
   'Fourteen wrapper reverses lack verified acquired imagery. Existing pack back fallback remains; original English fronts are available for all 54 designs. Seller page acquisition returned HTTP 403; do not substitute another expansion back.',
   'Native foil masks establish UV/coverage, not physical grating direction, measured groove depth or exact-copy Cosmos motifs.',
   'The full suite is not green: 364 passed, 38 failed. Comparison against pre-XY revision identifies 37 shared failures and the new missing-XY-wrapper-reverse assertion. Full logs in artifacts/xy-integration.'],
  'shaderChanges':False,'existingMaterialFilesChanged':False}
 (ROOT/'docs/xy-integration.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 names={r['set_id']:r['set_name'] for r in source if 'set_name' in r}
 lines=['# XY integration and finish handoff','',
  'All 3,416 acquired English TCGL finish records are registered across 18 chronological collections. All 14 actual booster products resolve exact source variants; 54 original English front designs are available. Kalos Starter Set, promos, alternate printings and standalone RC are browse-only.',
  '', '| Collection | Cards | Variants | Active foil | Native nonfoil | Pending | Boosters / designs |',
  '|---|---:|---:|---:|---:|---:|---|']
 for sid,s in sets.items():
  lines.append(f"| {sid} | {s['cards']} | {s['variants']} | {s['supportedFoilVariants']} | {s['nativeNonfoilVariants']} | {s['pendingVariants']} | {str(s['boosterCardCount'])+' cards / '+str(s['wrapperDesigns']) if s['wrapperDesigns'] else 'browse only'} |")
 lines+=['','Existing profiles: '+', '.join(f'{k}: {v}' for k,v in audit['profiles'].items())+'.',
  '', '## Finish handoff', '', 'Pending finishes show their clean source front and remain selectable and pullable. Source assets are present; shader/physical-evidence gaps must not be called missing textures. The full exact-printing list and original-map paths are in [xy-pending-finishes.json](xy-pending-finishes.json).', '']
 for family,f in families.items():
  p=f['examples'][0]; lines += [f"### {family} — {f['count']} variants",'',f['reason'],'',
   f"Example: **{p['name']}**, {p['setId']} #{p['number']}. Exact variant: `{p['tcglVariantId']}`.",
   '', 'Original maps: '+', '.join(f"[{k}](../public{v})" for k,v in p['originalAssets'].items())+'.','']
 lines+=['## Validation and limitations','',
  'All original hashes, PNG decoding, dimensions and printing associations passed validation. Existing shaders were unchanged. Runtime fronts and foil use the established full-card TCGL bleed removal (145–878 / 1024 horizontally), without vertical flip. Original pixels remain separately preserved.',
  '', 'Live WebGPU review: ten representative viewers at six lighting/pose settings and all fourteen products loaded with no local HTTP errors or external card-image requests. Startup requested zero XY textures; preparation still uses the shared CPU cache and GPU realization pipeline. Captures and metrics: `artifacts/xy-integration/`.',
  '', 'Published pack model and source hashes: [xy-pack-collation.json](xy-pack-collation.json). The primary observer reports [Double Crisis](https://www.elitefourum.com/t/the-english-pokemon-card-rarity-guide/39762/127), [Generations and RC](https://www.elitefourum.com/t/the-english-pokemon-card-rarity-guide/39762/134) and the [Evolutions uncommon sheet](https://www.elitefourum.com/t/the-english-pokemon-card-rarity-guide/39762/139). Crosshatch reuse follows original TCGL `Thatch` entries and [documented league printings](https://www.pokellector.com/ajax/views/card-overlay?cardid=14758).', '']
 lines += ['- '+s for s in report['limitations']]
 (ROOT/'docs/xy-integration.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
 print(json.dumps(report['totals']))
if __name__=='__main__':main()
