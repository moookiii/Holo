"""Preserve supplied SAM masks; prepare PNG coverage and full-resolution review overlays.

Regular holo maps are preparation assets only. No material or relief is generated.
"""
from pathlib import Path
import json, hashlib, shutil
import numpy as np
import cv2
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
INPUT = Path(r'C:\Users\jpall\Pictures\expedition base set')
BASE = ROOT / 'public/cards/pokemon/expedition'
MAPS = BASE / 'maps'
EVIDENCE = ROOT / 'research/expedition/masks'
REVIEW = ROOT / 'artifacts/expedition/masks'
for directory in (MAPS, EVIDENCE, REVIEW): directory.mkdir(parents=True, exist_ok=True)
cards = json.loads((BASE/'catalog.json').read_text(encoding='utf-8-sig'))['cards']
records = []
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def supplied(file):
    source = INPUT/file
    shutil.copyfile(source, EVIDENCE/file)
    rgba = np.array(Image.open(source).convert('RGBA'))
    # Preserve binary white silhouette. Yellow scan-edge artifact in 26 is not protection.
    gray = np.min(rgba[:,:,:3], axis=2)
    gray = np.where(gray > 200, 255, 0).astype('uint8')
    return Image.fromarray(gray), sha(source)

windows = {}
for kind in ['baby','basic','evo']:
    windows[kind], _ = supplied(f'{kind} foil mask.png')

for number in range(1,33):
    card = cards[number-1]
    kind = 'baby' if card.get('stage') == 'Baby' else 'evo' if card.get('evolveFrom') else 'basic'
    front = Image.open(BASE/f'{number}.png').convert('RGB')
    protection, source_hash = supplied(f'{number}.png')
    assert front.size == protection.size == windows[kind].size == (600,825)
    supplied_window = np.array(windows[kind])
    # Register the supplied contour to EACH master. Only the six-pixel frame band
    # may change; the interior and all SAM geometry are immutable. Yellow rail
    # detection is restricted to this geometric band, never used as foil or relief
    # detail. Filling the external contour prevents artwork-colored holes.
    kernel = np.ones((13,13),np.uint8)
    outer = cv2.dilate(supplied_window,kernel)
    inner = cv2.erode(supplied_window,kernel)
    hsv = cv2.cvtColor(np.array(front),cv2.COLOR_RGB2HSV)
    frame = (hsv[:,:,0]>=14)&(hsv[:,:,0]<=39)&(hsv[:,:,1]>=85)&(hsv[:,:,2]>=110)
    candidate = np.where((inner>0)|((outer>0)&~frame),255,0).astype('uint8')
    count, labels, stats, _ = cv2.connectedComponentsWithStats(candidate)
    component = np.where(labels == 1+np.argmax(stats[1:,cv2.CC_STAT_AREA]),255,0).astype('uint8')
    contours,_ = cv2.findContours(component,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    registered = np.zeros_like(component)
    cv2.drawContours(registered,contours,-1,255,cv2.FILLED)
    foil = Image.fromarray(registered)
    protection.save(MAPS/f'{number}-holo-protection.png')
    foil.save(MAPS/f'{number}-holo-window.png')
    # Green tint = future foil window; magenta = protected subject; cyan = window contour.
    arr = np.array(front).astype(float)
    f = np.array(foil)>0
    p = np.array(protection)>0
    arr[f] = arr[f]*.78 + np.array([0,255,80])*.22
    arr[p] = arr[p]*.68 + np.array([255,0,180])*.32
    eroded = f.copy()
    eroded[1:] &= f[:-1]; eroded[:-1] &= f[1:]
    eroded[:,1:] &= f[:,:-1]; eroded[:,:-1] &= f[:,1:]
    arr[f & ~eroded] = [0,255,255]
    overlay = Image.fromarray(arr.astype('uint8'))
    overlay.save(REVIEW/f'{number}-overlay.png')
    records.append({'cardId':card['id'], 'name':card['name'], 'master':f'{number}.png',
        'masterSha256':sha(BASE/f'{number}.png'), 'suppliedSam':f'{number}.png', 'samSha256':source_hash,
        'windowSource':f'{kind} foil mask.png', 'dimensions':[600,825],
        'transform':{'scale':[1,1],'translation':[0,0],'crop':None,'flipY':False},
        'frameRegistration':'Per-master yellow frame boundary within +/-6px of supplied contour; filled external contour, binary hard edge; no interior threshold or blur.',
        'frameCorrectionPixels':int(np.count_nonzero(registered != supplied_window)),
        'protectionSha256':sha(MAPS/f'{number}-holo-protection.png'),
        'windowSha256':sha(MAPS/f'{number}-holo-window.png'), 'reviewStatus':'pending-visual-review'})

for start in range(1,33,4):
    sheet = Image.new('RGB',(1200,1700),'#161a20')
    for i,n in enumerate(range(start,start+4)):
        x,y=(i%2)*600,(i//2)*850
        sheet.paste(Image.open(REVIEW/f'{n}-overlay.png'),(x,y+25))
        ImageDraw.Draw(sheet).text((x+12,y+5),f"{n}/165 {cards[n-1]['name']}",fill='white')
    sheet.save(REVIEW/f'sheet-{start}.png')
(BASE/'mask-evidence.json').write_text(json.dumps(records,indent=2)+'\n')
print('Prepared 32 protection PNGs, 32 window PNGs, and native-resolution overlays for review.')
