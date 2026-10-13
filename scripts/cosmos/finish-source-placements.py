"""Offline source-based placement; visual review explicitly skipped by the user.

Keep this separate from manually reviewed registries. Never place random dots,
replace a reviewed motif, change a master/coverage mask, or claim visual review.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
sys.dont_write_bytecode = True
import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
import author_missing as cosmos

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / 'scripts/cosmos/source-placements.json'
OUT = ROOT / 'public/cards/pokemon/cosmos-source-registered'
PROFILE = 'pokemon-base-set-2-cosmos'

def read(path):
    return json.loads(path.read_text(encoding='utf8'))

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def exports(era):
    return [json.loads(json.loads(line.split('JSON.parse(', 1)[1].removesuffix(');')))
            for line in (ROOT / f'src/pokemon/data/{era}-tcgl.generated.ts').read_text(encoding='utf8').splitlines()
            if 'JSON.parse(' in line]

def refine(c, foil, protection):
    """Conservatively accept filled, round source blobs, not edge highlights.

    This is machine screening, not a substitute for manual feature verification.
    Noncircular motifs and unresolved faint/micro features remain unverified.
    """
    photo = np.asarray(Image.open(ROOT / c['registeredReference']).convert('RGB'))
    master = np.asarray(Image.open(ROOT / c['master']).convert('RGB').resize(cosmos.COORDS))
    intensity = photo.max(2).astype(np.float32) / 255
    signal = np.maximum(0, intensity - gaussian_filter(intensity, 24))
    if not c['cardId'].startswith('neo3-'):
        printed = master.max(2).astype(np.float32) / 255
        signal = np.maximum(0, signal - np.maximum(0, printed - gaussian_filter(printed, 24)) * .9)
    motifs = []
    rejected = []
    for candidate in c['motifs']:
        x, y = map(int, candidate['center'])
        radius = candidate['radius']
        if protection[y, x] > 180 or foil[y, x] < 30:
            rejected.append(dict(id=candidate['id'], reason='opaque print or outside foil'))
            continue
        extent = max(8, int(radius * 2.4))
        left, top = max(0, x-extent), max(0, y-extent)
        right, bottom = min(600, x+extent+1), min(825, y+extent+1)
        patch = signal[top:bottom, left:right]
        peak = float(signal[y, x])
        if peak < .055:
            rejected.append(dict(id=candidate['id'], reason='insufficient source contrast'))
            continue
        binary = (patch > max(.035, peak * .38)).astype(np.uint8)
        count, labels, stats, centers = cv2.connectedComponentsWithStats(binary, 8)
        label = int(labels[y-top, x-left])
        if not label:
            rejected.append(dict(id=candidate['id'], reason='no filled source interior'))
            continue
        region = (labels == label).astype(np.uint8)
        contours, _ = cv2.findContours(region, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contour = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(contour)
        perimeter = cv2.arcLength(contour, True)
        bx, by, w, h = cv2.boundingRect(contour)
        circularity = 4*np.pi*area / max(1, perimeter*perimeter)
        fill = area / max(1, np.pi*w*h/4)
        cx, cy = centers[label] + [left, top]
        fitted = (w+h)/4
        if (area < 9 or min(w,h)/max(w,h) < .75 or circularity < .64
                or fill < .70 or fill > 1.30
                or np.hypot(cx-x, cy-y) > max(3, radius*.8)
                or fitted > radius*2.6 or fitted < radius*.55):
            rejected.append(dict(id=candidate['id'], reason='edge, fragment, noncircular or uncertain boundary'))
            continue
        # A solid antialiased ellipse uses the whole detected perimeter. Its
        # interior has no threshold holes, rings or internal highlight clusters.
        motifs.append(dict(center=[round(float(left+bx+(w-1)/2),2), round(float(top+by+(h-1)/2),2)],
                           radius=round(fitted,2), radii=[round(w/2,2),round(h/2,2)],
                           brightness=candidate['brightness'], proposalId=candidate['id'],
                           sourceCircularity=round(float(circularity),3)))
    distinct = []
    for d in sorted(motifs, key=lambda m: -m['radius']):
        if any(np.linalg.norm(np.subtract(d['center'], b['center'])) < max(b['radii']) + d['radius']*.2
               for b in distinct):
            rejected.append(dict(id=d['proposalId'],reason='satellite or duplicate within larger feature'))
        else:
            distinct.append(d)
    return distinct, rejected

def full_plate(path, size):
    with Image.open(path) as im:
        w,h = im.size
        return im.resize(size, Image.Resampling.BILINEAR, box=(145/1024*w,0,878/1024*w,h))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--era', choices=['sm','xy','bw','neo'], required=True)
    args = ap.parse_args()
    saved = {c['cardId']:c for c in read(REGISTRY)} if REGISTRY.exists() else {}
    proposals = read(ROOT / 'scripts/cosmos/proposals.json') + read(ROOT / 'scripts/cosmos/pending/proposals.json')
    # Never replace previously reviewed per-card geometry.
    reviewed = {c['cardId'] for c in read(ROOT / 'scripts/cosmos/registration.json')}
    reviewed |= {c['cardId'] for c in read(ROOT / 'scripts/cosmos/pending/registration.json')}
    reviewed |= {c['cardId'] for c in read(ROOT / 'scripts/tcgl/bw-cosmos/registration.json')}
    raw = {} if args.era == 'neo' else {s['cardId']:s for s in exports(args.era)[1] if s['foilType']=='Cosmos'}
    prefix = {'sm':('smalt-','smbsp-'), 'xy':('xyalt-','xybsp-'), 'bw':('bwalt-','bwbsp-'), 'neo':('neo3-',)}[args.era]
    pending = []
    chosen = sorted([c for c in proposals if c['cardId'].startswith(prefix)
                     and c['cardId'] not in reviewed and (args.era=='neo' or c['cardId'] in raw)],
                    key=lambda c: -int(c['cardId'].split('-')[-1]))
    for c in chosen:
        cid = c['cardId']
        if cid in saved:
            continue
        surface = raw.get(cid)
        if surface and surface['profile'] not in ('print-only',PROFILE):
            continue # Respect physically corrected sheen and unrelated finishes.
        for k,h in c['preservedHashes'].items():
            if sha(ROOT/c[k]) != h:
                raise ValueError('Source/master changed since registration: '+cid+':'+k)
        folder = OUT / cid
        folder.mkdir(parents=True, exist_ok=True)
        base = '/cards/pokemon/cosmos-source-registered/'+cid+'/'
        if 'foil' in c:
            foil_path, protection_path = ROOT/c['foil'], ROOT/c['protection']
            maps = dict(surface['maps']) if surface else dict(foil='/'+c['foil'].removeprefix('public/'),protection='/'+c['protection'].removeprefix('public/'))
            foil = np.asarray(Image.open(foil_path).convert('L').resize(cosmos.COORDS))
            protection = np.asarray(Image.open(protection_path).convert('L').resize(cosmos.COORDS))
        else:
            # Deferred XY/BW already preserve their exact TCGL whiteplate. Its
            # opaque print is intrinsic; do not invent a subject segmentation.
            plate = full_plate(ROOT/c['originalFoil'],(733,1024))
            plate.save(folder/'foil-controls.png',optimize=True)
            plate.convert('L').save(folder/'foil.png',optimize=True)
            Image.new('L',(733,1024),0).save(folder/'protection.png',optimize=True)
            maps = dict(foil=base+'foil.png',foilControls=base+'foil-controls.png',protection=base+'protection.png')
            foil = np.asarray(plate.convert('L').resize(cosmos.COORDS))
            protection = np.zeros_like(foil)
        motifs,rejected = refine(c,foil,protection)
        if not motifs:
            pending.append(dict(cardId=cid,name=c['name'],reason='No confidently filled circular source feature; no replacement geometry invented.'))
            print(cid,'no confident source geometry',flush=True)
            continue
        target = folder/'cosmos.png'
        cosmos.rasterize(motifs).save(target,optimize=True)
        maps['motif'] = base+'cosmos.png'
        if args.era == 'neo':
            # Existing map generator preserves these independently authored PNGs.
            (ROOT/c['destination']).write_bytes(target.read_bytes())
            maps['motif'] = '/'+c['destination'].removeprefix('public/')
        record = dict(c, motifs=motifs, rejectedCandidates=rejected,
                      reviewStatus='source-registered-unreviewed',visualReview=False,
                      reviewPolicy='User explicitly requested skipping card review on 2026-10-12.',
                      profile=PROFILE,maps=maps,evidence=base+'evidence.json',
                      outputDimensions=[1200,1650],motifSha256=sha(target),
                      outputHashes={k:sha(ROOT/('public'+p)) for k,p in maps.items()},
                      limitations='Machine-screened visible circular source features. Exact-copy placement is not manually verified; faint spots, swirls and angular motifs may be missing and residual false positives may remain. Physical angular response is uncalibrated. Existing optics and exact printed masters/protection are unchanged.')
        cosmos.write(folder/'evidence.json',record)
        saved[cid]=record
        print(cid,len(motifs),'source features; visual review skipped',flush=True)
    cosmos.write(REGISTRY,list(saved.values()))
    cosmos.write(ROOT/f'scripts/cosmos/source-pending-{args.era}.json',pending)
    records = [dict(cardId=c['cardId'],variant=c['variant'],tcglVariantId=c.get('tcglVariantId'),
                    maps=c['maps'],evidence=c['evidence']) for c in saved.values() if not c['cardId'].startswith('neo3-')]
    target = ROOT / 'src/pokemon/data/source-cosmos.generated.ts'
    target.write_text('// Offline source geometry; visual review skipped at user request.\n'
        'export interface SourceCosmosRecord { cardId: string; variant: string; tcglVariantId: string; maps: Record<string,string>; evidence: string; }\n'
        'export const sourceCosmos: SourceCosmosRecord[] = JSON.parse('+json.dumps(json.dumps(records))+');\n',encoding='utf8')
    print('Active source registrations',len(saved),'unresolved this era',len(pending),flush=True)

if __name__ == '__main__':
    main()
