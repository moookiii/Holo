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
cv2.setNumThreads(1)


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


def propose(photo, master, allowed, physical_master=False):
    """Contrast proposes geometry; the operator must review every whole window."""
    intensity = photo.max(2).astype(np.float32) / 255
    signal = np.maximum(0, intensity - gaussian_filter(intensity, 24))
    if not physical_master:
        printed = master.max(2).astype(np.float32) / 255
        # Only the exact clean printing rejects print details. No donor geometry.
        detail = np.maximum(0, printed - gaussian_filter(printed, 24))
        signal = np.maximum(0, signal - detail * .9)
    # Below ~1.5 source pixels a JPEG speck has no measurable outer perimeter.
    # Keep those unresolved instead of fabricating hundreds of tiny disks.
    scales = np.geomspace(1.65, 24, 30)
    cube = np.stack([-gaussian_laplace(signal, s) * s * s for s in scales], 2)
    peaks = (cube == maximum_filter(cube, size=3)) & (cube > .038)
    peaks &= allowed[..., None]
    ys, xs, ss = np.nonzero(peaks)
    clearance = cv2.distanceTransform(allowed.astype(np.uint8), cv2.DIST_L2, 5)
    result = []
    derivatives = {}
    for i in np.argsort(cube[ys, xs, ss])[::-1]:
        x, y, sigma = int(xs[i]), int(ys[i]), float(scales[ss[i]])
        radius = sigma * 2 ** .5
        if clearance[y, x] < max(2, radius * .55):
            continue
        if any(np.hypot(x-d['center'][0], y-d['center'][1]) < max(radius, d['radius']) * 1.05 for d in result):
            continue
        if sigma not in derivatives:
            derivatives[sigma] = [gaussian_filter(intensity, sigma, order=o) for o in [(0, 2), (2, 0), (1, 1)]]
        xx, yy, xy = [v[y, x] for v in derivatives[sigma]]
        eig = np.linalg.eigvalsh([[xx, xy], [xy, yy]])
        if eig[1] >= 0 or eig[1] / eig[0] < .22:
            continue
        x0, x1 = max(0, int(x-radius*2.2-2)), min(600, int(x+radius*2.2+3))
        y0, y1 = max(0, int(y-radius*2.2-2)), min(825, int(y+radius*2.2+3))
        gy, gx = np.mgrid[y0:y1, x0:x1]; distance = np.hypot(gx-x, gy-y)
        roi = photo[y0:y1, x0:x1].astype(float)
        ring = (distance > radius*1.6) & (distance < radius*2.1)
        if not ring.any():
            continue
        ground = np.median(roi[ring], axis=0)
        delta = np.max(roi-ground, axis=2)
        peak = float(np.max(delta[distance < max(1, radius*.5)]))
        fill = ((distance < radius*1.25) & (delta > max(12, peak*.3))).sum() / (np.pi*radius**2)
        if peak < 27 or fill < .42:
            continue
        result.append(dict(center=[x, y], radius=round(radius, 2), brightness=round(float(intensity[y, x]), 3)))
    result.sort(key=lambda d: (d['center'][1], d['center'][0]))
    for i, d in enumerate(result): d['id'] = i
    return result


def rasterize(motifs):
    # Continuous filled disks. Shape contours/paths are explicitly reviewed.
    mask = np.zeros((1650, 1200), np.float32)
    for d in motifs:
        gain = .5 + .5 * d.get('brightness', 1)
        if 'outline' in d or 'points' in d:
            im = Image.new('L', (2400, 3300)); draw = ImageDraw.Draw(im)
            if 'outline' in d: draw.polygon([(round(x*4), round(y*4)) for x,y in d['outline']], fill=255)
            else: draw.line([(round(x*4), round(y*4)) for x,y in d['points']], fill=255, width=max(1, round(d['width']*4)), joint='curve')
            np.maximum(mask, np.asarray(im.resize((1200,1650),Image.Resampling.LANCZOS))/255*gain, out=mask)
            continue
        x, y = d['center']; rx, ry = d.get('radii', [d['radius'], d['radius']]); r = max(rx,ry)
        l,t = max(0,int((x-r-1)*2)),max(0,int((y-r-1)*2))
        right,bottom = min(1200,int((x+r+1)*2+1)),min(1650,int((y+r+1)*2+1))
        gy,gx = np.mgrid[t:bottom,l:right]; dx,dy=(gx+.5)/2-x,(gy+.5)/2-y
        a=np.deg2rad(d.get('angle',0));u,v=dx*np.cos(a)+dy*np.sin(a),-dx*np.sin(a)+dy*np.cos(a)
        shape=np.clip((1-np.hypot(u/rx,v/ry))*min(rx,ry)*2+.5,0,1)*gain
        np.maximum(mask[t:bottom,l:right],shape,out=mask[t:bottom,l:right])
    return Image.fromarray(np.rint(mask*255).astype(np.uint8))


def review_images(c, photo, motifs, label='proposals'):
    folder=REVIEW/c['cardId'];folder.mkdir(parents=True,exist_ok=True)
    mask=rasterize(motifs)
    # Save the complete UV domain as well as the artwork zoom. The latter is
    # useful for choosing features, but cannot reveal border/crop mistakes.
    full=(1200,1650)
    full_mask=np.asarray(mask)
    master=np.asarray(Image.open(ROOT/c['master']).convert('RGB').resize(full))
    foil=np.asarray(Image.open(ROOT/c['foil']).convert('L').resize(full))
    protection=np.asarray(Image.open(ROOT/c['protection']).convert('L').resize(full))
    boundary=master.copy()
    for plate,color in ((foil,(0,210,255)),(protection,(255,205,0)),(full_mask,(255,20,170))):
        contours,_=cv2.findContours((plate>80).astype(np.uint8),cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(boundary,contours,-1,color,2)
    Image.fromarray(boundary).save(folder/(label+'-master-boundaries-full.png'))
    photo_full=np.asarray(Image.fromarray(photo).resize(full)).copy()
    contours,_=cv2.findContours((full_mask>80).astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(photo_full,contours,-1,(255,20,170),2)
    Image.fromarray(photo_full).save(folder/(label+'-reference-overlay-full.png'))
    mask.save(folder/(label+'-motifs-full.png'))
    preview=photo.copy(); contours,_=cv2.findContours((np.asarray(mask.resize(COORDS))>80).astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(preview,contours,-1,(255,20,170),1)
    zoom=Image.fromarray(preview).resize((1200,1650)).crop((70,170,1140,855))
    zoom.save(folder/(label+'-overlay.png'))
    Image.fromarray(photo).resize((1200,1650)).crop((70,170,1140,855)).save(folder/'reference-zoom.png')
    mask.crop((70,170,1140,855)).save(folder/(label+'-motifs.png'))
    marker=Image.fromarray(photo).resize((1200,1650));draw=ImageDraw.Draw(marker)
    for d in motifs:
        if 'center' not in d: continue
        x,y=d['center'];r=d['radius']
        draw.ellipse(((x-r)*2,(y-r)*2,(x+r)*2,(y+r)*2),outline='#ff00b0',width=1)
        draw.text((x*2+2,y*2+2),str(d.get('id','+')),fill='white',stroke_width=1,stroke_fill='black')
    marker.crop((70,170,1140,855)).save(folder/(label+'-numbered.png'))
    pair=Image.new('RGB',(2140,710),'#121821')
    pair.paste(Image.fromarray(photo).resize((1200,1650)).crop((70,170,1140,855)),(0,25))
    pair.paste(marker.crop((70,170,1140,855)),(1070,25))
    ImageDraw.Draw(pair).text((8,5),c['cardId']+' '+c['name']+' | reference and '+label+' boundaries',fill='white')
    pair.save(folder/(label+'-compare.png'))


def review_tiles(c, photo, motifs, label='proposals'):
    """Native-coordinate foil-window tiles for checking the small-dot field."""
    folder=REVIEW/c['cardId']/'tiles';folder.mkdir(parents=True,exist_ok=True)
    master=Image.open(ROOT/c['master']).convert('RGB').resize(COORDS)
    foil=np.asarray(Image.open(ROOT/c['foil']).convert('L').resize(COORDS))
    ys,xs=np.nonzero(foil>20)
    if not len(xs): return
    x0,x1=max(0,int(xs.min())-3),min(600,int(xs.max())+4)
    y0,y1=max(0,int(ys.min())-3),min(825,int(ys.max())+4)
    for top in range(y0,y1,155):
        for left in range(x0,x1,160):
            right,bottom=min(left+160,x1),min(top+155,y1)
            box=(left,top,right,bottom)
            size=((right-left)*4,(bottom-top)*4)
            reference=Image.fromarray(photo).crop(box).resize(size)
            printed=master.crop(box).resize(size)
            marked=reference.copy();draw=ImageDraw.Draw(marked)
            for d in motifs:
                if 'center' not in d: continue
                x,y=d['center']
                if not (left<=x<right and top<=y<bottom): continue
                rx,ry=d.get('radii',[d['radius'],d['radius']])
                px,py=(x-left)*4,(y-top)*4
                draw.ellipse((px-rx*4,py-ry*4,px+rx*4,py+ry*4),outline='#ff00b0',width=2)
                draw.text((px+4,py+4),str(d.get('id','+')),fill='white',stroke_width=2,stroke_fill='black')
            panel=Image.new('RGB',(size[0]*3,size[1]+24),'#111820')
            for i,im in enumerate((reference,marked,printed)):panel.paste(im,(i*size[0],24))
            ImageDraw.Draw(panel).text((4,4),f"{c['cardId']} {label} x={left}:{right} y={top}:{bottom} | reference / motifs / clean master",fill='white')
            panel.save(folder/f'{label}-{top:03d}-{left:03d}.png')


def tiles(ids=None):
    records=json.loads((DATA/'proposals.json').read_text(encoding='utf8'))
    corrections=json.loads((DATA/'corrections.json').read_text(encoding='utf8'))
    for c in records:
        if ids and c['cardId'] not in ids: continue
        photo=np.asarray(Image.open(ROOT/c['registeredReference']).convert('RGB'))
        correction=corrections.get(c['cardId'])
        motifs=corrected(c,correction) if correction else c['motifs']
        review_tiles(c,photo,motifs,'draft' if correction else 'proposals')


def proposals(ids=None):
    sources=json.loads((DATA/'sources.json').read_text(encoding='utf8'))
    saved_path=DATA/'proposals.json'
    saved={r['cardId']:r for r in json.loads(saved_path.read_text(encoding='utf8'))} if saved_path.exists() else {}
    def process(c):
        cid=c['cardId']
        master=np.asarray(Image.open(ROOT/c['master']).convert('RGB').resize(COORDS))
        folder=REF/cid;folder.mkdir(parents=True,exist_ok=True)
        if 'reference' in c:
            photo=master; transform=dict(method='identity; original full-card physical scan',masterToReference=np.eye(3).tolist())
            selected=dict(file=c['reference'],pageUrl=c['sourceUrl'],imageUrl=c['sourceUrl'],sha256=sha(ROOT/c['reference']))
        else:
            choices=[]
            for candidate in c.get('candidates',[]):
                result=register(c,candidate)
                if result: choices.append((result[1]['inliers'],candidate,result))
            if not choices:
                print(cid,'NO REGISTERED SOURCE',flush=True);return None
            _,selected,(photo,transform)=max(choices,key=lambda t:t[0])
            transform['method']='SIFT print anchors; RANSAC projective registration to exact clean full-card master'
        Image.fromarray(photo).save(folder/'registered.png')
        foil=np.asarray(Image.open(ROOT/c['foil']).convert('L').resize(COORDS));protection=np.asarray(Image.open(ROOT/c['protection']).convert('L').resize(COORDS))
        allowed=(foil>20)&(protection<180)
        motifs=propose(photo,master,allowed,'reference' in c)
        review_images(c,photo,motifs)
        result=dict(c,source=selected,registration=transform,coordinateDimensions=list(COORDS),
            registeredReference=(folder/'registered.png').relative_to(ROOT).as_posix(),motifs=motifs,reviewStatus='candidate-only')
        print(cid,len(motifs),'features',flush=True)
        return result
    chosen=[c for c in sources if not ids or c['cardId'] in ids]
    with ThreadPoolExecutor(max_workers=4) as pool:
        for result in pool.map(process, chosen):
            if result:
                saved[result['cardId']]=result
                write(saved_path,list(saved.values()))


def corrected(c, correction):
    motifs = c['motifs']
    if 'keepIds' in correction:
        motifs = [d for d in motifs if d['id'] in correction['keepIds']]
    motifs = [d for d in motifs if d['id'] not in correction.get('removeIds', [])
        and not any(cv2.pointPolygonTest(np.array(p,np.float32),tuple(map(float,d['center'])),False)>=0
                    for p in correction.get('excludePolygons', []))]
    additions = correction.get('add', [])
    def inside(d, a):
        if 'outline' in a:
            return cv2.pointPolygonTest(np.array(a['outline'],np.float32),tuple(map(float,d['center'])),False)>=0
        if 'center' not in a: return False
        rx,ry=a.get('radii',[a['radius'],a['radius']]);dx,dy=np.subtract(d['center'],a['center'])
        angle=np.deg2rad(a.get('angle',0));u,v=dx*np.cos(angle)+dy*np.sin(angle),-dx*np.sin(angle)+dy*np.cos(angle)
        return np.hypot(u/rx,v/ry)<1.08
    motifs=[d for d in motifs if not any(inside(d,a) for a in additions)]+additions
    # Explicit large-feature additions replace their fragment candidates.
    distinct=[]
    for d in sorted(motifs,key=lambda d:-d.get('radius',0)):
        if 'center' in d and any(d.get('radius',0)<a.get('radius',0)*.6 and inside(d,a) for a in distinct): continue
        distinct.append(d)
    return distinct


def finalize(ids=None, publish=False):
    proposals=json.loads((DATA/'proposals.json').read_text(encoding='utf8'))
    corrections=json.loads((DATA/'corrections.json').read_text(encoding='utf8'))
    dest=DATA/'registration.json'
    saved={c['cardId']:c for c in json.loads(dest.read_text(encoding='utf8'))} if dest.exists() else {}
    for c in proposals:
        cid=c['cardId']
        if ids and cid not in ids: continue
        correction=corrections.get(cid)
        if not correction: continue
        if publish:
            assert correction.get('reviewed') and correction.get('sourceAlignmentReviewed'), cid
        motifs=corrected(c,correction)
        photo=np.asarray(Image.open(ROOT/c['registeredReference']).convert('RGB'))
        review_images(c,photo,motifs,'final' if publish else 'draft')
        if not publish: continue
        assert motifs, 'No measurable physical features: '+cid
        for k,h in c['preservedHashes'].items(): assert sha(ROOT/c[k])==h,(cid,k)
        target=ROOT/c['destination'];rasterize(motifs).save(target,optimize=True)
        record=dict(c,motifs=motifs,reviewStatus='reviewed-visible-features',reviewNotes=correction['notes'],
            outputDimensions=[1200,1650],motifSha256=sha(target),
            limitations='Matches visible features on the selected physical copy; unresolved subpixel scan grain is omitted. Other copies have different sheet positions. Flat scans do not calibrate physical optical depth.')
        saved[cid]=record
        if 'evidence' in c:
            path=ROOT/c['evidence'];e=json.loads(path.read_text(encoding='utf8'))
            e['maps']['motif']='/'+c['destination'].removeprefix('public/')
            e.setdefault('outputHashes',{})['motif']=record['motifSha256']
            e['cosmosPlacement']=dict(status='reviewed-visible-features',registration='scripts/cosmos/registration.json',
                reference=record['source'],coordinateDimensions=list(COORDS),outputDimensions=[1200,1650],
                transform=record['registration'],reviewNotes=correction['notes'],limitations=record['limitations'])
            write(path,e)
        print(cid,len(motifs),'published',flush=True)
    if publish:
        write(dest,list(saved.values()))
        lines=SM.read_text(encoding='utf8').splitlines()
        for i,line in enumerate(lines):
            if 'tcglSmSurfaces' not in line or 'JSON.parse(' not in line: continue
            surfaces=json.loads(json.loads(line.split('JSON.parse(',1)[1].removesuffix(');')))
            for s in surfaces:
                c=saved.get(s['cardId'])
                if c and s['profile']=='pokemon-base-set-2-cosmos':
                    s['maps']['motif']='/'+c['destination'].removeprefix('public/')
            lines[i]=line.split('JSON.parse(',1)[0]+'JSON.parse('+json.dumps(json.dumps(surfaces,ensure_ascii=False),ensure_ascii=False)+');'
        SM.write_text('\n'.join(lines)+'\n',encoding='utf8')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('action', choices=['inventory', 'sources', 'propose', 'draft', 'publish', 'tiles']); ap.add_argument('--ids',nargs='+'); args = ap.parse_args()
    if args.action == 'inventory': write(DATA / 'inventory.json', inventory())
    elif args.action == 'sources': sources()
    elif args.action=='propose': proposals(args.ids)
    elif args.action=='tiles': tiles(args.ids)
    else: finalize(args.ids,args.action=='publish')
