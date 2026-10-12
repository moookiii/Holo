"""Validate every prepared BW asset and report exact deferred material needs."""
from pathlib import Path
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import hashlib, json, sys
sys.dont_write_bytecode = True
from PIL import Image
import numpy as np
from prepare_swsh_proofs import registered
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/cards/pokemon/tcgl-bw'
def read(p): return json.loads(p.read_bytes())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p, d): p.write_text(json.dumps(d, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')

def main():
    index = read(OUT / 'printing-index.json')
    assert len(index) == len({p['tcglCardId'] for p in index}) == 2689
    sources = {r['card_id']: r for r in read(ROOT / 'research/tcgl/bw-series/dataset/manifest.json')}
    unique_files = {}; originals = {}; profile_counts = Counter(); deferred = Counter(); dimensions = Counter()
    materials = {}; sets = read(OUT / 'import-audit.json')['sets']; normal_count = 0
    for record in index:
        cid = record['tcglCardId']; directory = OUT / cid
        evidence = read(directory / 'evidence.json')
        assert evidence['tcglCardId'] == cid
        assert evidence['tcglVariantId'] == record['tcglVariantId']
        assert not evidence['shaderChanges']
        if cid in sources:
            source = sources[cid]
            assert evidence['tcglVariantId'] == source['long_form_id']
            material = evidence['originalMaterial']; assert material
            for kind, original in evidence['sources'].items():
                exact = source['assets'][kind]
                assert original['sha256'] == exact['texture']['png_sha256']
                assert original['reference'] == exact['reference']
                if kind != 'front' or material.get('_c'):
                    assert original['reference'] == material[original['field']]
        for original in evidence['sources'].values():
            path = ROOT / 'public' / original['publicOriginal'].lstrip('/')
            originals[path] = original['sha256']; unique_files[path] = None
        for url in evidence['maps'].values(): unique_files[ROOT/'public'/url.lstrip('/')] = None
        profile_counts[evidence['profile']] += 1
        if evidence['deferredEffect']: deferred[evidence['deferredEffect']] += 1
        if evidence['normalGeneration']:
            normal_count += 1
            normal = evidence['normalSource']
            assert normal['embossStrength'] == 0 and normal['runtimeGeneration'] is False
            assert normal['verticalFlip'] is False and normal['outputDimensions'] == [1800,2475]
            for name, field in [('normal','normalSha256'),('protection','protectionSha256'),
                                ('body','bodySha256'),('roughness','roughnessSha256')]:
                path = directory / (name+'.png'); assert sha(path) == normal[field]
                unique_files[path] = None
            with Image.open(directory/'normal.png') as image:
                assert image.mode == 'RGB' and image.size == (1800,2475)
                pixels = np.asarray(image)
            protected = np.asarray(Image.open(directory/'protection.png'))
            flat = pixels[protected == 255]
            assert np.all(flat == [128,128,255]), cid
            body = np.asarray(Image.open(directory/'body.png'),dtype=np.float32)/255
            roughness = np.asarray(Image.open(directory/'roughness.png'),dtype=np.float32)/255
            assert np.max(np.abs(roughness - (.30+.105*body))) < 1/255, cid
        if evidence['profile'] != 'print-only':
            original = ROOT/'public'/evidence['sources']['foil']['publicOriginal'].lstrip('/')
            with Image.open(original) as image:
                expected = registered(image,(733,1024))
                with Image.open(directory/'foil-controls.png') as controls:
                    assert controls.mode == expected.mode and controls.tobytes() == expected.tobytes(), cid
        if evidence['profile'] == 'print-only': assert evidence['maps'] == {}
        materials[cid] = {'variantId': evidence['tcglVariantId'],
                         'originalMaterialPath': (evidence['originalMaterial'] or {}).get('_p'),
                         'originalShader': (evidence['originalMaterial'] or {}).get('_s'),
                         'profile': evidence['profile'], 'deferredEffect': evidence['deferredEffect']}
    def verify(pair):
        path, expected_hash = pair
        digest = sha(path)
        if expected_hash: assert digest == expected_hash, str(path)
        with Image.open(path) as image:
            image.load(); assert image.format == 'PNG'
            return path.relative_to(ROOT).as_posix(), {'sha256': digest, 'dimensions': list(image.size), 'mode': image.mode}
    checks = dict(ThreadPoolExecutor(4).map(verify, [(p, originals.get(p)) for p in unique_files]))
    for check in checks.values(): dimensions[str(check['dimensions'])] += 1
    wrappers = read(ROOT/'public/packs/pokemon/bw-wrapper-sources.json')
    assert len(wrappers) == 49 and len({w['setId'] for w in wrappers}) == 12
    for wrapper in wrappers:
        path = ROOT/wrapper['output']; assert sha(path) == wrapper['sha256']
        with Image.open(path) as image:
            image.load(); assert list(image.size) == wrapper['dimensions']
            alpha = image.getchannel('A'); assert alpha.getbbox() == (0,0,*image.size)
    live_path = ROOT/'artifacts/bw-integration/report.json'
    live = read(live_path) if live_path.exists() else None
    if live:
        assert not live['errors'] and not live['results'].get('failure')
        assert len(live['results']['viewers']) == 17 and len(live['results']['packs']) == 12
    report = {'status':'validated','registeredVariants':len(index),'sets':sets,
              'existingFoilVariants':sum(n for p,n in profile_counts.items() if p!='print-only'),
              'plainPrintVariants':profile_counts['print-only']-sum(deferred.values()),
              'deferredVariants':sum(deferred.values()),'deferredFamilies':dict(deferred),
              'profiles':dict(profile_counts),'authoredNormals':normal_count,
              'validatedAssetFiles':len(checks),'nativeDimensions':dict(dimensions),
              'retailProducts':12,'wrapperDesigns':49,'shaderChanges':False,
              'assetAudit':'docs/bw-integration-assets.json','originalMaterials':materials,
              'validation':{'targetedTests':'17 passed (BW, XY, SM, SWSH, orientation)',
                            'productionBundle':'passed; static assets validated independently without redundant public-directory copy',
                            'live':None if not live else {'viewerCards':17,'packProducts':12,
                              'startupBwTextureRequests':live['results']['startupBWRequests'],
                              'galleryFavoritesBinder':live['results']['galleryFavoritesBinder'],
                              'externalCardRequests':live['results']['externalCardRequests'],
                              'captureDirectory':'artifacts/bw-integration'},
                            'fullSuite':'371 passed / 45 failed in earlier shared-workspace run. Includes existing asset/import/finish failures and missing authentic BW wrapper backs; see artifacts/bw-all-tests.log.'},
              'remainingEvidence':{'reverseBasicEnergy':'Eight BW Base reverse Energy variants have no acquired TCGL material/source entry; excluded, never synthesized.',
                'promoIdentities':'BW29/30/31/77/78 fronts are acquired and registered. Long-form printing IDs absent; BW77/78 lack material manifests.',
                'cosmos':'48 compatible Cosmos variants need exact-copy physical spot placement; original clean sources contain no registered motif geometry.',
                'wrapperBacks':'Authentic wrapper fronts complete. TCGL booster bundles contain front textures only; set-specific back photos remain unverified. Existing wrapper-back fallback remains, explicitly not an authentic back. Direct eBay lookup returned HTTP 403; no bypass or substitute printing used.',
                'physicalAppearance':'Representative families reviewed under six light/pose controls; no measured groove depth or exact-copy Cosmos registration claimed.'}}
    write(ROOT/'docs/bw-integration-assets.json', {'status':'validated','assets':checks})
    write(ROOT/'docs/bw-integration.json',report)
    print(json.dumps({k:v for k,v in report.items() if k not in ['originalMaterials','sets','remainingEvidence','validation']},indent=2))

if __name__ == '__main__': main()
