"""Scoped LOB acquisition, conservative normalization, audit and publication.
No browser requests; no generative cleanup, enhancement or invented detail.
"""
import argparse
import hashlib
import json
import shutil
import urllib.request
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

from policy import TARGET, assess, rank

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'public/cards/yugioh/lob-first-edition'
INPUT = ROOT / 'scripts/lob-fronts/candidates.json'
CATALOG = ROOT / 'src/yugioh/sets/lob-data.json'


def local_path(value):
    p = (ROOT / value).resolve()
    if not p.is_relative_to(ROOT):
        raise ValueError('Asset path escapes repository')
    return p


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(value, indent=2, ensure_ascii=False) + '\n'
    if not path.exists() or path.read_text(encoding='utf-8') != content:
        path.write_text(content, encoding='utf-8')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def measure(image):
    # Fixed-size comparison: source dimensions and high-frequency noise alone
    # cannot outrank a clean, reviewed scan. Compression/glare need visual checks.
    a = np.asarray(image.convert('RGB'))
    gray = cv2.cvtColor(cv2.resize(a, (400, 580), interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV)
    lum = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY).astype(float)
    dx = np.abs(np.diff(lum, axis=1))
    return {'width': image.width, 'height': image.height,
            'sharpness': round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 3),
            'glareProxy': round(float(np.mean((hsv[:, :, 1] < 25) & (hsv[:, :, 2] > 248))), 5),
            'jpegBlockProxy': round(float(dx[:, 7::8].mean() / max(1, dx.mean())), 3),
            'measurementNotes': 'Sharpness measured at 400x580. White artwork and print dots can affect proxies; manual review is mandatory.'}


def normalize(image, candidate):
    spec = candidate.get('normalization', {})
    im = ImageOps.exif_transpose(image).convert('RGB')
    if spec.get('crop'):
        x0, y0, x1, y1 = spec['crop']
        if not (0 <= x0 < x1 <= im.width and 0 <= y0 < y1 <= im.height):
            raise ValueError('Crop outside physical source')
        im = im.crop((x0, y0, x1, y1))
    if spec.get('quad'):
        # Points TL, TR, BR, BL, in original pixels. Retain rounded corners.
        q = np.array(spec['quad'], dtype=np.float32)
        if q.shape != (4, 2) or spec.get('crop') or not cv2.isContourConvex(q):
            raise ValueError('Invalid perspective quad')
        if (q < 0).any() or (q[:, 0] >= im.width).any() or (q[:, 1] >= im.height).any():
            raise ValueError('Perspective corners outside source')
        widths = [np.linalg.norm(q[1]-q[0]), np.linalg.norm(q[2]-q[3])]
        heights = [np.linalg.norm(q[3]-q[0]), np.linalg.norm(q[2]-q[1])]
        if max(widths)/min(widths) > 1.1 or max(heights)/min(heights) > 1.1:
            raise ValueError('Perspective too strong to normalize conservatively')
        # Use shorter native edge; never create extra nominal resolution.
        h = int(min(heights)); w = min(int(min(widths)), round(h*59/86))
        h = min(h, round(w*86/59))
        dst = np.array([[0, 0], [w-1, 0], [w-1, h-1], [0, h-1]], dtype=np.float32)
        m = cv2.getPerspectiveTransform(q, dst)
        im = Image.fromarray(cv2.warpPerspective(np.array(im), m, (w, h), flags=cv2.INTER_CUBIC))
    ratio = im.width/im.height
    if abs(ratio-59/86)/(59/86) > .04:
        raise ValueError('Card proportions outside tolerance; do not stretch')
    return im


def acquire(candidate, download):
    path = local_path(candidate['originalPath'])
    if not path.exists():
        if not download:
            raise FileNotFoundError('Original missing; explicit --download required')
        # Only explicitly registered in-scope fronts. No crawling or catalog image dump.
        req = urllib.request.Request(candidate['imageUrl'], headers={'User-Agent': 'Holo-LOB-source-review/1.0'})
        with urllib.request.urlopen(req, timeout=25) as response:
            if not response.headers.get('Content-Type', '').startswith('image/'):
                raise ValueError('Source did not return an image')
            data = response.read(30_000_001)
        if len(data) > 30_000_000:
            raise ValueError('Image exceeds scoped download size limit')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    if candidate.get('sha256') and candidate['sha256'] != digest(path):
        raise ValueError('Source checksum changed; printing review must be repeated')
    with Image.open(path) as im:
        im.load()
        return path, normalize(im, candidate), list(im.size)


def run(download=False, apply=False):
    cards = json.loads(CATALOG.read_text(encoding='utf-8'))
    expected = [f'LOB-{i:03}' for i in range(126)]
    if [c['number'] for c in cards] != expected:
        raise ValueError('Only the original 126-card catalog may be processed')
    manifest = json.loads(INPUT.read_text(encoding='utf-8'))
    candidates = manifest['candidates']
    ids = set()
    for c in candidates:
        if c['setCode'] not in expected or c['id'] in ids or not c['id'].replace('-', '').isalnum():
            raise ValueError('Out-of-scope or duplicate/unsafe candidate')
        ids.add(c['id'])
    records = []
    for card in cards:
        evaluated = []
        for c in [c for c in candidates if c['setCode'] == card['number']]:
            item = dict(c)
            try:
                path, im, original_size = acquire(c, download)
                metrics = measure(im)
                item.update(metrics=metrics, originalResolution=original_size, sha256=digest(path),
                            assessment=assess(c, card, metrics))
            except (OSError, ValueError, KeyError) as e:
                item['assessment'] = {'eligible': False, 'priority': 99, 'score': 0, 'reasons': ['acquisition-error:' + str(e)]}
            evaluated.append(item)
        ranked = rank(evaluated)
        winner = next((c for c in ranked if c['assessment']['eligible']), None)
        # Baseline stays explicitly degraded unless a candidate passes the full gate.
        baseline = next((c for c in ranked if c.get('baseline')), None)
        if not baseline:
            raise ValueError('Every card must preserve a baseline with provenance')
        selected = winner or baseline
        status = 'exact-print-high-quality' if winner else ('ygoprodeck-fallback' if baseline['kind'] == 'ygoprodeck' else 'unverified-print-fallback')
        runtime = card['front']
        if winner:
            _, im, _ = acquire(winner, False)
            runtime = f"/cards/yugioh/lob-first-edition/fronts/{card['number']}.png"
            if apply:
                out = ROOT / ('public' + runtime)
                out.parent.mkdir(parents=True, exist_ok=True)
                im.save(out, optimize=True)
        else:
            # Restore original fallback when a formerly approved replacement is rejected.
            runtime = baseline['runtimePath']
        flags = [] if winner else ['no-verified-high-quality-exact-print-source', *selected['assessment']['reasons']]
        flags += selected.get('reviewFlags', [])
        provenance = {'schemaVersion': 2,
            'catalogIdentity': {'provider': 'YGOPRODeck', 'cardId': card['passcode'], 'cardName': card['modernName'],
                                'setCode': card['number'], 'rarity': card['rarity'], 'sourceUrl': manifest['catalogUrl']},
            'printingIdentity': {'target': {**TARGET, 'setCode': card['number']},
                                'claimed': selected.get('claimedPrinting'),
                                'verified': selected.get('printingEvidence', {}).get('observed', {}),
                                'confidence': selected.get('printingEvidence', {}).get('confidence', 0),
                                'evidence': selected.get('printingEvidence', {}).get('notes', []),
                                'verificationStatus': 'verified' if winner else 'unverified'},
            'imageProvenance': {'candidateId': selected['id'], 'sourceUrl': selected['sourceUrl'],
                'sourceSite': selected['sourceSite'], 'originalImageUrl': selected['imageUrl'],
                'originalPath': selected['originalPath'], 'originalResolution': selected.get('originalResolution'),
                'runtimePath': runtime, 'resolution': [selected.get('metrics', {}).get('width'), selected.get('metrics', {}).get('height')],
                'sha256': selected.get('sha256'), 'normalization': selected.get('normalization', {}),
                'upscaled': selected.get('upscaled', False), 'assetStatus': status, 'exactPrint': bool(winner),
                'fallback': not bool(winner), 'quality': selected.get('metrics'), 'caveats': selected.get('caveats', [])},
            'manualReview': {'required': bool(flags), 'flags': list(dict.fromkeys(flags))},
            'candidates': ranked}
        records.append(provenance)
        if apply:
            # Compatibility fields retain physical-layout semantics for existing mask tools.
            source = {'image': selected['imageUrl'], 'reference': selected['sourceUrl'],
                      'metadata': manifest['catalogUrl'],
                      'fidelity': 'general-image-fallback' if selected['kind'] == 'ygoprodeck' else 'original-scan',
                      'notes': ' '.join(selected.get('caveats', [])) or 'Reviewed exact-print front; see per-card provenance.',
                      'assetStatus': status, 'manualReview': bool(flags),
                      'provenance': f"/cards/yugioh/lob-first-edition/{card['number']}.json"}
            card.update(front=runtime, source=source)
            write_json(PUBLIC / f"{card['number']}.json", {**source, **provenance})
    summary = {'total': 126, 'exactPrintHighQuality': sum(r['imageProvenance']['exactPrint'] for r in records),
        'fallback': sum(r['imageProvenance']['fallback'] for r in records),
        'manualReview': sum(r['manualReview']['required'] for r in records),
        'unresolved': [r['catalogIdentity']['setCode'] for r in records if r['manualReview']['required']],
        'ygoprodeckFallback': [r['catalogIdentity']['setCode'] for r in records if r['imageProvenance']['sourceSite'] == 'YGOPRODeck'],
        'normalized': [r['catalogIdentity']['setCode'] for r in records if r['imageProvenance']['normalization']],
        'upscaled': [r['catalogIdentity']['setCode'] for r in records if r['imageProvenance']['upscaled']]}
    output = PUBLIC if apply else ROOT / 'artifacts/lob-fronts'
    write_json(output / 'sources.json', {'schemaVersion': 2, 'summary': summary, 'records': records})
    write_json(output / 'manual-review.json', {'summary': summary, 'cards': [r for r in records if r['manualReview']['required']]})
    if apply:
        write_json(CATALOG, cards)
    print(json.dumps(summary, indent=2))
    return summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true', help='Fetch only registered missing LOB candidates')
    parser.add_argument('--apply', action='store_true', help='Publish passing fronts and explicit fallback provenance')
    args = parser.parse_args()
    run(args.download, args.apply)
