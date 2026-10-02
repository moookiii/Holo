"""LC reverse optical masks registered to clean fronts; never relief.
Review source-coordinate overlays in artifacts/lc-review after regeneration.
Requires Pillow, numpy and OpenCV.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[2]
FRONTS = ROOT / 'public/cards/pokemon/legendary-collection'
MAPS = FRONTS / 'maps'
REVIEW = ROOT / 'artifacts/lc-review'
REVIEW.mkdir(parents=True, exist_ok=True)
SIZE = (600, 825)
cv2.setNumThreads(2)

# The evolution badge is the same printed die shape across LC Pokemon.
# Extract its contour from neutral Pidgeotto stock, where gold is separable;
# never classify orange/fire/fighting stock as part of the badge.
badge_rgb = np.array(Image.open(FRONTS / '34.png').convert('RGB')).astype(float)
br, bg, bb = badge_rgb.transpose(2, 0, 1)
BADGE = np.zeros((825, 600), np.uint8)
BADGE[25:147, 23:145] = np.uint8(np.clip((np.minimum(br, bg)-bb-18)/35, 0, 1)*255)[25:147, 23:145]
BADGE[54:122, 46:122] = 255

def circle(cx, cy, radius):
    y, x = np.mgrid[:825, :600]
    return np.uint8(np.clip(radius+.5-np.hypot(x-cx, y-cy), 0, 1)*255)

def registered_window(rgb, category):
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(float)
    if category == 'Energy':
        return (22, 120, 578, 602)
    if category == 'Trainer':
        ranges = (range(48, 61), range(182, 198), range(545, 558), range(455, 470))
        horizontal, vertical = (80, 530), (215, 445)
    else:
        ranges = (range(48, 61), range(80, 96), range(539, 555), range(427, 441))
        horizontal, vertical = (155, 530), (160, 410)
    x0, x1 = horizontal
    y0, y1 = vertical
    vx = lambda x: np.mean(np.abs(gray[y0:y1, x] - gray[y0:y1, x-2]))
    hy = lambda y: np.mean(np.abs(gray[y, x0:x1] - gray[y-2, x0:x1]))
    return (max(ranges[0], key=vx)-1, max(ranges[1], key=hy)-1,
            max(ranges[2], key=vx), max(ranges[3], key=hy))

def ink_mask(rgb):
    # Brightest channel separates black pigment from colored stock. Closing
    # estimates local paper, preserving glyph counters and antialiased edges.
    channel = rgb.max(axis=2).astype(np.float32)
    paper = cv2.morphologyEx(channel, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    ink = np.clip((paper-channel-12)/np.maximum(45, paper*.48), 0, 1)
    r, g, b = rgb.astype(float).transpose(2, 0, 1)
    # Red pigment needs local contrast in green, otherwise entire fire stock
    # is selected. Limit this extraction to HP and Pokemon Power lettering.
    green_paper = cv2.morphologyEx(g.astype(np.float32), cv2.MORPH_CLOSE, np.ones((13, 13), np.uint8))
    red = np.clip((r-np.maximum(g, b)-45)/70, 0, 1) * np.clip((green_paper-g-18)/65, 0, 1)
    red_regions = np.zeros_like(red)
    red_regions[43:83, 390:507] = red[43:83, 390:507]
    red_regions[477:505, 70:515] = red[477:505, 70:515]
    ink = np.maximum(ink, red_regions)
    count, labels, stats, _ = cv2.connectedComponentsWithStats((ink > .16).astype('uint8'))
    keep = np.zeros(count, bool)
    for label in range(1, count):
        x, y, w, h, area = stats[label]
        keep[label] = area >= 3 and ink[y:y+h, x:x+w][labels[y:y+h, x:x+w] == label].max() > .55
    return np.uint8(np.round(ink*keep[labels]*255))

cards = json.loads((FRONTS / 'catalog.json').read_text(encoding='utf-8'))['cards']
audit = []
for card in cards:
    number, category = int(card['localId']), card['category']
    path = ROOT / 'public/cards/eevee-legendary-reverse/front.png' if number == 74 else FRONTS / f'{number}.png'
    rgb = np.array(Image.open(path).convert('RGB'))
    bounds = registered_window(rgb, category)
    foil = Image.new('L', SIZE, 255)
    ImageDraw.Draw(foil).rectangle(bounds, fill=0)
    foil.save(MAPS / f'{number}-reverse-foil.png')
    icons = []
    if number == 74:
        protection = np.array(Image.open(ROOT / 'public/cards/eevee-legendary-reverse/protection.png').convert('L'))
    else:
        protection = ink_mask(rgb)
        body = np.zeros((825, 600), np.uint8)
        body[21:804, 22:579] = 255
        protection = np.minimum(protection, body)
        if category == 'Pokemon':
            r, g, b = rgb.astype(float).transpose(2, 0, 1)
            gold = np.uint8(np.clip((np.minimum(r, g)-b-18)/35, 0, 1)*255)
            protection[439:472, 73:528] = np.maximum(protection[439:472, 73:528], gold[439:472, 73:528])
            if card.get('stage') not in ('Basic', None):
                protection = np.maximum(protection, BADGE)
            gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
            found = cv2.HoughCircles(gray, cv2.HOUGH_GRADIENT, 1, 25,
                param1=90, param2=24, minRadius=13, maxRadius=22)
            if found is not None:
                for cx, cy, radius in found[0]:
                    header = 510 < cx < 546 and 45 < cy < 77
                    attack = 30 < cx < 112 and 480 < cy < 672 and radius < 19
                    footer = 700 < cy < 732 and 45 < cx < 550 and radius < 18
                    if header or attack or footer:
                        icons.append([round(float(cx), 2), round(float(cy), 2), round(float(radius), 2)])
                        protection = np.maximum(protection, circle(cx, cy, radius))
            mark = np.zeros_like(protection)
            mark[440:471, 534:559] = protection[440:471, 534:559]
            protection = np.maximum(protection, cv2.dilate(mark, np.ones((3, 3), np.uint8)))
        protection = np.minimum(protection, np.array(foil))
        Image.fromarray(protection).save(MAPS / f'{number}-reverse-protection.png')
    protected = np.maximum(protection, 255-np.array(foil))/255
    overlay = rgb.astype(float)*(1-protected[..., None]*.45) + np.array([30, 230, 180])*protected[..., None]*.45
    Image.fromarray(np.uint8(overlay)).save(REVIEW / f'{number}-overlay.png')
    audit.append({'number': number, 'window': bounds, 'icons': icons})
(REVIEW / 'registration.json').write_text(json.dumps(audit, indent=2))
laminate = Image.new('L', (1200, 1650), 140)
ImageDraw.Draw(laminate).rectangle((110, 172, 1093, 873), fill=119)
laminate.save(MAPS / '74-reverse-laminate.png')
print('Registered 110 reverse coverage PNGs and 109 ink protection PNGs; overlays:', REVIEW)
