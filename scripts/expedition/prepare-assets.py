"""Offline PNG geometry and compact thumbnails; never crops numbered fronts."""
from pathlib import Path
import json, hashlib, shutil, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT/'public/cards/pokemon/expedition'
MAPS = BASE/'maps'
THUMBS = BASE/'thumbnails'
THUMBS.mkdir(exist_ok=True)
cards = json.loads((BASE/'catalog.json').read_text(encoding='utf-8-sig'))['cards']
for card in cards:
    n = int(card['localId'])
    source = BASE/f'{n}.png'
    front = Image.open(source).convert('RGB')
    assert front.size == (600,825)
    thumb = front.copy(); thumb.thumbnail((240,330),Image.Resampling.LANCZOS)
    thumb.save(THUMBS/f'{n}.webp', quality=85)
    if n > 159 or n in [40,139,140,141,143,146,147]: continue
    if card['category'] == 'Pokemon' and card.get('evolveFrom'):
        # Preserve the supplied upper frame; restore registered lower panels
        # after legacy mask generation below.
        shutil.copyfile(ROOT/'scripts/expedition/evolved-reverse-mask.png', MAPS/f'{n}-reverse.png')
        continue
    # Existing e-reader body/name coverage, authored in full-card coordinates.
    # Protect the illustration, yellow reader rails, evolution badge and ID ribbon.
    scale = 4
    mask = Image.new('L',(600*scale,825*scale),0)
    draw = ImageDraw.Draw(mask)
    def polygon(points, fill=232): draw.polygon([(x*scale,y*scale) for x,y in points],fill=fill)
    def rounded(box,radius,fill=232): draw.rounded_rectangle(tuple(v*scale for v in box),radius*scale,fill=fill)
    if card['category'] == 'Trainer':
        polygon([(308,69),(585,69),(585,13),(364,13)])
        polygon([(69,77),(584,77),(584,91),(580,110),(564,122),(140,122),(104,132),(69,151)])
        rounded((67,440,585,753),42)
        polygon([(69,436),(543,436),(543,625),(585,655),(585,751),(524,751),(516,772),(258,772),(247,758),(103,758),(69,725)])
    elif card['category'] == 'Energy':
        # Special Energy graphic remains ink; foil covers its printed rules panel.
        polygon([(69,544),(584,544),(584,754),(551,754),(518,774),(292,774),(254,760),(105,754),(69,728)])
    else:
        if card.get('evolveFrom'):
            polygon([(140,20),(580,20),(580,35),(183,35)])
            polygon([(165,42),(580,42),(580,89),(156,89),(126,97),(145,70)])
        else:
            rounded((67,22,581,96),30)
            polygon([(98,22),(581,22),(581,91),(142,91),(104,104),(67,130),(67,56)])
        polygon([(65,382),(84,396),(142,409),(180,409),(180,420),(578,420),(578,753),
            (548,753),(516,775),(257,775),(241,757),(106,756),(79,747),(65,726)])
    mask.resize((600,825),Image.Resampling.LANCZOS).save(MAPS/f'{n}-reverse.png')

# Crop the actual wrapper photograph to its physical extents; full seals retained.
records = json.loads((ROOT/'scripts/expedition/wrapper-sources.json').read_text())
for row in records:
    if 'design' not in row: continue
    source = ROOT/'research/expedition/wrappers'/row['file']
    im = Image.open(source).convert('RGB')
    arr = np.array(im)
    # Black studio background; largest nonblack component is the complete wrapper.
    import cv2
    candidate = (np.max(arr,axis=2)>32).astype('uint8')
    count,labels,stats,_ = cv2.connectedComponentsWithStats(candidate)
    x,y,w,h,_ = stats[1+np.argmax(stats[1:,cv2.CC_STAT_AREA])]
    crop = [int(x),int(y),int(x+w),int(y+h)]
    im = im.crop(crop)
    output = ROOT/'public/packs/pokemon'/row['file']; im.save(output)
    row.update(crop=crop, dimensions=list(im.size),sha256=hashlib.sha256(output.read_bytes()).hexdigest())
(ROOT/'scripts/expedition/wrapper-sources.json').write_text(json.dumps(records,indent=2)+'\n')
subprocess.run([sys.executable,str(ROOT/'scripts/expedition/register-reverse-boundaries.py')],cwd=ROOT,check=True)
print('Prepared full-front thumbnails, reverse coverage and four wrapper photographs.')
