"""Independent output integrity, full-card registration and etched-normal audit."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import cv2
import numpy as np
from PIL import Image
from prepare_swsh_proofs import registered
from convert_30th_sources import normal_pixels

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/cards/pokemon/tcgl-sm'


def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def validate(record):
    evidence = json.loads((OUT / (record['tcglCardId'] or record['cardId']) / 'evidence.json').read_bytes())
    if record['tcglCardId'] is None:
        assert evidence['tcglVariantId'] is None and evidence['sourceIdentifier'] == record['sourceIdentifier']
        return {'cardId':record['cardId'],'status':'validated-source-only-promo','normal':False}
    assert evidence['tcglVariantId'] == record['tcglVariantId']
    for kind, source in evidence['sources'].items():
        assert sha(ROOT / source['file']) == source['sha256'], (record['tcglCardId'],kind)
    for kind, url in evidence['maps'].items():
        path = ROOT / ('public' + url)
        assert sha(path) == evidence['outputHashes'][kind]
        with Image.open(path) as im:
            im.load(); assert im.format == 'PNG'
            assert im.size == ((1800,2475) if kind == 'normal' else (1200,1650) if kind == 'motif' else (733,1024))
    textured = 'normal' in evidence['maps']
    if textured:
        assert evidence['conversion']['slopeGain'] == 1.03 and evidence['conversion']['embossStrength'] == 0
        with Image.open(ROOT / evidence['sources']['foil']['file']) as raw:
            plate = np.asarray(registered(raw,(733,1024)).convert('RGBA'),dtype=np.float32)[...,:3].mean(2)/255
        protection = cv2.resize(1-np.clip(plate*8,0,1),(1800,2475),interpolation=cv2.INTER_LINEAR)
        with Image.open(ROOT / evidence['sources']['etch']['file']) as raw:
            expected = normal_pixels(registered(raw,(733,1024)),protection)
        path = ROOT / ('public' + evidence['maps']['normal'])
        with Image.open(path) as im:
            assert im.mode == 'RGB'
            actual = np.asarray(im)
            assert np.array_equal(expected,actual), record['tcglCardId']
            protected = protection > .999999
            assert np.all(actual[protected] == np.array([128,128,255])), record['tcglCardId']
    return {'cardId':record['cardId'],'tcglCardId':record['tcglCardId'],'status':'validated','normal':textured}


def main():
    cv2.setNumThreads(1)
    records = json.loads((OUT / 'printing-index.json').read_bytes())
    assert len(records) == 5010
    results = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        for i,r in enumerate(pool.map(validate,records),1):
            results.append(r)
            if i%100==0: print('Independently validated',i,'/',len(records),flush=True)
    report = {'status':'validated','printings':len(results),'exactNormalComparisons':sum(r['normal'] for r in results),
              'sourceOnlyPromos':sum(r['status']=='validated-source-only-promo' for r in results),'results':results}
    (OUT / 'validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Validated all source hashes, output PNGs, and exact reference-normal pixels.',flush=True)


if __name__=='__main__':main()
