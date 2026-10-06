"""Offline full-card Cosmos registration; proposals require human visual review.

Default regeneration uses saved centers/shapes, never image detection. --propose
measures candidates separately. --finalize applies explicit reviewed corrections
to those candidates and saves the registration. SAM and front PNGs are read-only.
"""
from pathlib import Path
from io import BytesIO
import argparse
import hashlib
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, gaussian_laplace, maximum_filter

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/cards/pokemon/aquapolis'
DATA = ROOT / 'scripts/aquapolis'
REVIEW = ROOT / 'artifacts/aquapolis/cosmos'
REVIEW.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument('--propose', action='store_true')
parser.add_argument('--finalize', action='store_true')
args = parser.parse_args()
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def propose(front, clean_art, allowed):
    intensity = front.max(axis=2).astype(np.float32) / 255
    printed = clean_art.max(axis=2).astype(np.float32) / 255
    # Matching non-holo artwork is only a print-rejection reference. It never
    # supplies positions or replaces the holo master or the provided masks.
    print_detail = np.maximum(0, printed - gaussian_filter(printed, 6))
    signal = np.maximum(0, intensity - gaussian_filter(intensity, 6) - print_detail)
    # Work inside the illustration but keep global coordinates in the results.
    signal = signal[90:410, 50:590]
    scales = np.geomspace(.8, 18, 36)
    cube = np.stack([-gaussian_laplace(signal, s)*s*s for s in scales], axis=2)
    peaks = (cube == maximum_filter(cube, size=3)) & (cube > .037)
    peaks &= allowed[90:410, 50:590, None]
    y, x, s = np.nonzero(peaks)
    clearance = cv2.distanceTransform(allowed.astype(np.uint8), cv2.DIST_L2, 5)
    result = []
    derivatives = {}
    for i in np.argsort(cube[y, x, s])[::-1]:
        cx, cy, radius = int(x[i]+50), int(y[i]+90), float(scales[s[i]]*2**.5)
        if clearance[cy, cx] < max(2, radius*.65):
            continue
        sigma = scales[s[i]]
        if sigma not in derivatives:
            derivatives[sigma] = [gaussian_filter(intensity, sigma, order=order)
                                  for order in [(0, 2), (2, 0), (1, 1)]]
        xx, yy, xy = [v[cy, cx] for v in derivatives[sigma]]
        eigenvalues = np.linalg.eigvalsh([[xx, xy], [xy, yy]])
        if eigenvalues[1] >= 0 or eigenvalues[1]/eigenvalues[0] < .30:
            continue
        if any(np.hypot(cx-d['center'][0], cy-d['center'][1]) < max(radius, d['radius'])*.85 for d in result):
            continue
        left, right = max(0, int(cx-radius*2-2)), min(600, int(cx+radius*2+3))
        top, bottom = max(0, int(cy-radius*2-2)), min(825, int(cy+radius*2+3))
        gy, gx = np.mgrid[top:bottom, left:right]
        distance = np.hypot(gx-cx, gy-cy)
        roi = front[top:bottom, left:right].astype(float)
        annulus = (distance > radius*1.55) & (distance < radius*2.1)
        ground = np.median(roi[annulus], axis=0)
        delta = np.max(roi-ground, axis=2)
        peak = float(np.max(delta[distance < max(1, radius*.5)]))
        pixels = int(((distance < radius*1.3) & (delta > max(12, peak*.32)) & allowed[top:bottom, left:right]).sum())
        if peak < 35 or pixels/(np.pi*radius*radius) < .50:
            continue
        brightness = float(np.percentile(intensity[top:bottom, left:right][distance < max(1, radius*.5)], 90))
        result.append({'center': [cx, cy], 'radius': round(radius, 3), 'brightness': round(brightness, 4)})
    return result


def rasterize(motifs):
    # Evaluate continuous geometry at output pixel centers. Only the perimeter
    # is antialiased; every disk interior has a constant, positive optical gain.
    # max composition preserves brighter neighboring motifs without holes.
    mask = np.zeros((1650, 1200), np.float32)
    for d in motifs:
        gain = .35+.65*d.get('brightness', 1)
        if 'outline' in d:
            image = Image.new('L', (2400, 3300)); draw = ImageDraw.Draw(image)
            draw.polygon([(round(x*4), round(y*4)) for x, y in d['outline']], fill=255)
            np.maximum(mask, np.array(image.resize((1200,1650),Image.Resampling.LANCZOS))/255*gain, out=mask)
            continue
        if 'points' in d:
            image = Image.new('L', (2400, 3300)); draw = ImageDraw.Draw(image)
            draw.line([(round(x*4), round(y*4)) for x, y in d['points']], fill=255,
                      width=max(1, round(d['width']*4)), joint='curve')
            np.maximum(mask, np.array(image.resize((1200, 1650), Image.Resampling.LANCZOS))/255*gain, out=mask)
            continue
        x, y = d['center']; rx, ry = d.get('radii', [d['radius'], d['radius']])
        r = max(rx, ry)
        left, right = max(0, int((x-r-1)*2)), min(1200, int((x+r+1)*2+1))
        top, bottom = max(0, int((y-r-1)*2)), min(1650, int((y+r+1)*2+1))
        gy, gx = np.mgrid[top:bottom, left:right]
        angle = np.deg2rad(d.get('angle', 0))
        dx, dy = (gx+.5)/2-x, (gy+.5)/2-y
        u, v = dx*np.cos(angle)+dy*np.sin(angle), -dx*np.sin(angle)+dy*np.cos(angle)
        distance = np.hypot(u/rx, v/ry)
        shape = np.clip((1-distance)*min(rx,ry)*2+.5, 0, 1)*gain
        np.maximum(mask[top:bottom,left:right], shape, out=mask[top:bottom,left:right])
    return Image.fromarray(np.rint(mask*255).astype(np.uint8))


def inside_feature(candidate, feature):
    """Remove internal highlights, preserving dots outside a reviewed boundary."""
    if 'outline' in feature:
        return cv2.pointPolygonTest(np.array(feature['outline'],np.float32),tuple(map(float,candidate['center'])),False)>=0
    if 'center' not in feature:
        return False
    rx, ry = feature.get('radii', [feature['radius'], feature['radius']])
    dx, dy = np.subtract(candidate['center'], feature['center'])
    angle = np.deg2rad(feature.get('angle', 0))
    u, v = dx*np.cos(angle)+dy*np.sin(angle), -dx*np.sin(angle)+dy*np.cos(angle)
    return np.hypot(u/rx, v/ry) <= 1.07


source_file = DATA / ('cosmos-proposals.json' if args.propose or args.finalize else 'cosmos-registration.json')
saved = {} if args.propose else {r['cardId']: r for r in json.loads(source_file.read_text())}
corrections = json.loads((DATA/'cosmos-corrections.json').read_text()) if args.finalize else {}
catalog = json.loads((ASSETS/'catalog.json').read_text())['cards']
report = []
for number in range(1, 33):
    n = f'H{number}'
    card = next(c for c in catalog if c['localId'] == n)
    card_id = card['id']
    front = np.array(Image.open(ASSETS/f'{n}.png').convert('RGB'))
    foil = np.array(Image.open(ASSETS/f'maps/{n}-holo-window.png').convert('L'))
    protection = np.array(Image.open(ASSETS/f'maps/{n}-holo-protection.png').convert('L'))
    allowed = (foil > 127) & (protection < 180)
    donor = next(c for c in catalog if c['name'] == card['name'] and c['rarity'] == 'Rare')
    clean_art = np.array(Image.open(ASSETS/f"{donor['localId']}.png").convert('RGB'))
    motifs = propose(front, clean_art, allowed) if args.propose else saved[card_id]['motifs']
    if args.finalize:
        correction = corrections[card_id]
        assert correction['reviewed'], card_id
        additions = correction.get('add', [])
        motifs = [d for d in motifs if not any(np.hypot(d['center'][0]-x, d['center'][1]-y) < r
                  for x, y, r in correction.get('remove', []))
                  and not any(inside_feature(d, a) for a in additions)] + additions
        # Reviewed large features own their interiors: discard tiny satellites.
        distinct = []
        for d in sorted(motifs, key=lambda d: -d.get('radius', 0)):
            if 'center' in d and any('center' in a and d['radius'] < a['radius']*.5 and
                inside_feature(d,a) for a in distinct):
                continue
            distinct.append(d)
        motifs = distinct
    mask = rasterize(motifs)
    if not args.propose:
        encoded = BytesIO(); mask.save(encoded, format='PNG', optimize=True)
        destination = ASSETS/f'maps/{n}-cosmos.png'
        if not destination.exists() or destination.read_bytes() != encoded.getvalue():
            temporary = destination.with_suffix('.tmp'); temporary.write_bytes(encoded.getvalue()); temporary.replace(destination)
    preview = np.array(Image.fromarray(front).resize((1200, 1650)))
    contours, _ = cv2.findContours((np.array(mask)>80).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(preview, contours, -1, (255, 25, 180), 1)
    overlay = Image.fromarray(preview)
    overlay.save(REVIEW/f'{n}-overlay.png')
    mask.save(REVIEW/f'{n}-motifs.png')
    # Native-detail whole foil window, plus grid for explicit correction coordinates.
    zoom = overlay.crop((100, 180, 1180, 820))
    zoom.save(REVIEW/f'{n}-zoom.png')
    grid = zoom.copy(); draw = ImageDraw.Draw(grid)
    for x in range(50, 591, 25):
        draw.line(((x-50)*2, 0, (x-50)*2, 640), fill=(90, 110, 130), width=1)
        draw.text(((x-50)*2+2, 2), str(x), fill='white', stroke_width=1, stroke_fill='black')
    for y in range(100, 410, 25):
        draw.line((0, (y-90)*2, 1080, (y-90)*2), fill=(90, 110, 130), width=1)
        draw.text((2, (y-90)*2+2), str(y), fill='white', stroke_width=1, stroke_fill='black')
    grid.save(REVIEW/f'{n}-grid.png')
    report.append({'cardId': card_id, 'name': card['name'], 'coordinateSize': [600, 825],
                   'printRejectionReference': donor['id'], 'masterSource': f'https://images.pokemontcg.io/ecard2/{n}_hires.png',
                   'registrationMethod': 'Offline contrast/LoG proposals plus explicit whole-window manual corrections; no runtime image detection or random placements', 'variant': f'English Aquapolis {n}/H32 Holo Rare',
                   'masterSha256': sha(ASSETS/f'{n}.png'), 'protectionSha256': sha(ASSETS/f'maps/{n}-holo-protection.png'),
                   'windowSha256': sha(ASSETS/f'maps/{n}-holo-window.png'),
                   'transform': {'crop': None, 'flipY': False, 'offset': [0, 0]},
                   'reviewStatus': 'candidate-only' if args.propose else 'reviewed-visible-features',
                   **({'reviewNotes': corrections[card_id]['notes'], 'observedShapes': corrections[card_id].get('observedShapes', [])}
                      if args.finalize else {}),
                   'motifs': motifs, **({} if args.propose else {'outputSize': [1200, 1650], 'motifSha256': sha(ASSETS/f'maps/{n}-cosmos.png')})})
    print(card_id, len(motifs), flush=True)
if args.propose or args.finalize:
    destination = DATA/('cosmos-proposals.json' if args.propose else 'cosmos-registration.json')
    destination.write_text(json.dumps(report, separators=(',', ':'))+'\n')
