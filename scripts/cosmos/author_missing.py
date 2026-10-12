"""Offline, reviewed placement for the 149 previously blank Cosmos printings.

Sources and proposals are separate from registration. Only --publish activates
reviewed geometry. Ordinary regeneration reads registration, never detects dots.
Printed masters, foil/protection maps and Cosmos optics are read-only.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import argparse
import hashlib
import html
import json
import re
import sys
sys.dont_write_bytecode = True
import cv2
import numpy as np
import requests
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, gaussian_laplace, maximum_filter

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'scripts/cosmos'
REF = ROOT / 'research/cosmos-missing'
REVIEW = ROOT / 'artifacts/cosmos-missing'
SM = ROOT / 'src/pokemon/data/sm-tcgl.generated.ts'
COORDS = (600, 825)


def read_exports():
    return [json.loads(json.loads(line.split('JSON.parse(', 1)[1].removesuffix(');')))
            for line in SM.read_text(encoding='utf8').splitlines() if 'JSON.parse(' in line]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


def inventory():
    sets, surfaces = read_exports()
    cards = {c['id']: dict(c, setName=s['name']) for s in sets for c in s['cards']}
    result = []
    for s in surfaces:
        if s['profile'] != 'pokemon-base-set-2-cosmos':
            continue
        c = cards[s['cardId']]
        result.append(dict(cardId=s['cardId'], name=c['name'], number=c['collectorNumber'],
            set=c['setName'], variant=s['variant'], tcglVariantId=s['tcglVariantId'],
            master='public/cards/pokemon/tcgl-sm/' + c['variantFronts'][s['variant']],
            foil='public' + s['maps']['foil'], protection='public' + s['maps']['protection'],
            destination='public/cards/pokemon/tcgl-sm/' + Path(s['evidence']).parent.name + '/cosmos.png',
            evidence='public' + s['evidence']))
    neo = ROOT / 'public/cards/pokemon/neo-revelation'
    for c in json.loads((neo / 'catalog.json').read_text())['cards']:
        if not c['variants']['holo']:
            continue
        n = c['localId']
        base = 'public/cards/pokemon/neo-revelation/'
        result.append(dict(cardId=c['id'], name=c['name'], number=n + '/64',
            set='Neo Revelation', variant='holo', edition='first-edition',
            master=base + n + '.png', foil=base + 'maps/' + n + '-foil.png',
            protection=base + 'maps/' + n + '-protection.png',
            destination=base + 'maps/' + n + '-cosmos.png'))
    assert len(result) == 149
    for c in result:
        c['preservedHashes'] = {k: sha(ROOT / c[k]) for k in ('master', 'foil', 'protection')}
    return result


def request_json(url, params=None):
    for attempt in range(3):
        try:
            r = requests.get(url, params=params, timeout=55)
            r.raise_for_status()
            return r.json()
        except Exception:
            if attempt == 2:
                raise


def sources():
    """Exact English Cosmos catalog entries; no nonfoil stock images accepted."""
    REF.mkdir(parents=True, exist_ok=True)
    params = dict(holofoil=658, language=1260, per_page=100,
        _embed='wp:featuredmedia', _fields='id,title,link,featured_media,content,promo_set,release_year,_links,_embedded')
    def page(n):
        p = REF / f'pokumon-cosmos-{n}.json'
        if not p.exists():
            write(p, request_json('https://pokumon.com/wp-json/wp/v2/card', dict(params, page=n)))
        return json.loads(p.read_text(encoding='utf8'))
    with ThreadPoolExecutor(max_workers=4) as pool:
        entries = [c for rows in pool.map(page, range(1, 10)) for c in rows]
    report = []
    for c in inventory():
        if c['set'] == 'Neo Revelation':
            report.append(dict(c, reference=c['master'], sourceUrl='https://assets.tcgdex.net/en/neo/neo3/' + c['number'].split('/')[0] + '/high.png',
                sourceKind='physical-card master scan', selectionStatus='exact master'))
            continue
        normalize = lambda s: re.sub(r'[^a-z0-9/]', '', html.unescape(s).lower())
        name, number = normalize(c['name']), normalize(c['number'])
        candidates = []
        for e in entries:
            title = normalize(e['title']['rendered'])
            if name not in title:
                continue
            # SM identifiers need an end boundary: SM06 must not match SM060.
            if number.startswith('sm'):
                digits, suffix = re.fullmatch(r'sm(\d+)([a-z]*)', number).groups()
                match = re.search(r'sm0*' + str(int(digits)) + suffix + r'(?![0-9a-z])', html.unescape(e['title']['rendered']).lower())
            else:
                match = re.search(r'(?<![0-9])' + re.escape(number) + r'(?![0-9])', title)
            media = e.get('_embedded', {}).get('wp:featuredmedia', [{}])[0]
            if match and 'source_url' in media:
                candidates.append(dict(postId=e['id'], title=html.unescape(e['title']['rendered']),
                    pageUrl=e['link'], imageUrl=media['source_url'],
                    dimensions=[media['media_details']['width'], media['media_details']['height']],
                    description=html.unescape(re.sub('<[^>]+>', '', e['content']['rendered']))))
        report.append(dict(c, candidates=candidates, selectionStatus='needs exact-artwork review'))
    def download(c):
        for e in c.get('candidates', []):
            dest = REF / c['cardId'] / (str(e['postId']) + Path(e['imageUrl']).suffix)
            dest.parent.mkdir(parents=True, exist_ok=True)
            if not dest.exists():
                r = requests.get(e['imageUrl'], timeout=45); r.raise_for_status()
                dest.write_bytes(r.content)
            with Image.open(dest) as im:
                e['decodedDimensions'] = list(im.size)
            e['file'] = dest.relative_to(ROOT).as_posix()
            e['sha256'] = sha(dest)
        print(c['cardId'], len(c.get('candidates', [])), flush=True)
        return c
    with ThreadPoolExecutor(max_workers=5) as pool:
        report = list(pool.map(download, report))
    write(DATA / 'sources.json', report)
    print('No-source:', [c['cardId'] for c in report if not c.get('candidates') and 'reference' not in c])


def register(c, candidate):
    front = np.asarray(Image.open(ROOT / c['master']).convert('RGB').resize(COORDS))
    photo = cv2.cvtColor(cv2.imread(str(ROOT / candidate['file'])), cv2.COLOR_BGR2RGB)
    # Rules and title are stable print anchors; exclude the foil picture.
    anchors = np.full((825, 600), 255, np.uint8); anchors[85:425, 30:570] = 0
    sift = cv2.SIFT_create(nfeatures=7000, contrastThreshold=.025)
    ka, da = sift.detectAndCompute(cv2.cvtColor(front, cv2.COLOR_RGB2GRAY), anchors)
    kb, db = sift.detectAndCompute(cv2.cvtColor(photo, cv2.COLOR_RGB2GRAY), None)
    matches = [a for a, b in cv2.BFMatcher().knnMatch(da, db, k=2) if a.distance < .72 * b.distance]
    if len(matches) < 12:
        return None
    a = np.float32([ka[m.queryIdx].pt for m in matches]); b = np.float32([kb[m.trainIdx].pt for m in matches])
    h, accepted = cv2.findHomography(a, b, cv2.RANSAC, 3)
    if h is None or accepted.sum() < 12:
        return None
    error = np.linalg.norm(cv2.perspectiveTransform(a[:, None, :], h)[:, 0, :] - b, axis=1)
    warped = cv2.warpPerspective(photo, np.linalg.inv(h), COORDS)
    return warped, dict(masterToReference=h.tolist(), inliers=int(accepted.sum()),
        medianReprojectionError=float(np.median(error[accepted.ravel() == 1])))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('action', choices=['inventory', 'sources']); args = ap.parse_args()
    if args.action == 'inventory': write(DATA / 'inventory.json', inventory())
    else: sources()
