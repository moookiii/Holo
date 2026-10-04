"""Align existing PNG material maps with published front replacements only.
No optical settings, relief or Secret Rare assets are changed. Rectangle bounds
remain physical registration estimates; title masks use individual glyphs.
"""
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pipeline import ROOT, PUBLIC, write_json, write_png


def title_mask(front, bounds, metallic_silver):
    w, h = front.size
    box = tuple(round(v * (w if i % 2 == 0 else h)) for i, v in enumerate(bounds))
    crop = front.crop(box).convert('L')
    # Smooth print dots only while extracting a mask, never in the card front.
    a = np.array(crop.filter(ImageFilter.GaussianBlur(max(.7, w/750))), dtype=float)
    bg = np.array(crop.filter(ImageFilter.GaussianBlur(w/150)), dtype=float)
    dark = np.clip((bg-a-5)/25, 0, 1)*np.clip((180-a)/65, 0, 1)
    rgb = np.array(front.crop(box).filter(ImageFilter.GaussianBlur(max(.7,w/750))))
    hsv = cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV).astype(float)
    # Estimate the plate's RGB color around each narrow stroke. Silver can
    # match plate luminance while differing in chroma, so grayscale alone
    # loses whole bright letters. Median background preserves counters.
    kernel = max(15,round(w/30)|1)
    plate = cv2.medianBlur(rgb,kernel).astype(float)
    difference = np.linalg.norm(rgb.astype(float)-plate,axis=2)
    light = np.clip((difference-15)/35,0,1)
    # Silver photos contain both dark recessed strokes and bright metal flecks.
    # Retain the letter silhouette rather than selecting just the bright flecks.
    ink = light if metallic_silver else dark
    closed = cv2.morphologyEx((ink>.12).astype('uint8'),cv2.MORPH_CLOSE,np.ones((3,3),'uint8'))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(closed, 8)
    keep = np.zeros(ink.shape, dtype=bool)
    for i in range(1, count):
        x, y, cw, ch, area = stats[i]
        if (h*.009 <= ch <= h*.055 and cw < w*.8 and area >= w/100
                and x>0 and y>0 and x+cw<ink.shape[1] and y+ch<ink.shape[0]):
            keep |= labels == i
    result = Image.new('L', (w, h))
    result.paste(Image.fromarray(np.uint8(ink*keep*255)), box[:2])
    return result


def run():
    rows = json.loads((ROOT/'src/yugioh/sets/lob-data.json').read_text(encoding='utf-8'))
    path = ROOT/'src/yugioh/sets/lob-registration.json'
    registrations = json.loads(path.read_text(encoding='utf-8'))
    strips = []
    changed = []
    for card in rows:
        if '/fronts/' not in card['front']:
            continue
        if card['rarity'] == 'Secret Rare':
            raise ValueError('Secret Rare registration is outside this sourcing task')
        n = card['number']
        front = Image.open(ROOT/('public'+card['front'])).convert('RGB')
        w, h = front.size
        old = registrations[n]
        # Same early printed layout, not the modern baseline template.
        art = [.140, .216, .857, .710]
        title = [.070, .065, .799, .132]
        if n == 'LOB-078': title = [.095, .045, .799, .140]
        stamp = [.918, .948, .968, .984]
        if n == 'LOB-123':
            art = [.144, .218, .855, .711]; stamp = [.929, .950, .968, .983]
        registrations[n] = {**old, 'artwork': art, 'title': title, 'stamp': stamp,
            'sourceSize': [w, h], 'status': 'estimated-from-replacement-front',
            'front': card['front']}
        def rectangle(bounds):
            mask = Image.new('L', (w, h))
            x0,y0,x1,y1 = [round(v*(w if i%2 == 0 else h)) for i,v in enumerate(bounds)]
            ImageDraw.Draw(mask).rectangle((x0,y0,x1-1,y1-1),fill=255)
            return mask
        foil = rectangle(art) if card['rarity'] in ('Super Rare','Ultra Rare') else Image.new('L', (w,h))
        security = rectangle(stamp)
        name = Image.new('L',(w,h))
        if card['rarity'] in ('Rare','Ultra Rare'):
            silver = card['rarity'] == 'Rare'
            name = title_mask(front, title, silver)
            strip = Image.new('RGB',(1000,125),'#15191f')
            crop = (0,round(h*.055),w,round(h*.14))
            strip.paste(front.crop(crop).resize((500,75)),(0,25))
            strip.paste(name.crop(crop).convert('RGB').resize((500,75)),(500,25))
            ImageDraw.Draw(strip).text((5,4),n+' '+card['name'],fill='white')
            strips.append(strip)
        for suffix,mask in [('foil',foil),('stamp',security),('name',name)]:
            write_png(PUBLIC/'maps'/f'{n}-{suffix}.png',mask)
        if n == 'LOB-123':
            overlay = front.copy()
            overlay.paste(Image.new('RGB',(w,h),(0,220,255)),(0,0),foil.point(lambda v:round(v*.3)))
            overlay.paste(Image.new('RGB',(w,h),(255,0,100)),(0,0),name)
            overlay.save(ROOT/'artifacts/lob-fronts/LOB-123-overlay.png')
        changed.append(n)
    write_json(path, registrations)
    for offset in range(0,len(strips),8):
        sheet = Image.new('RGB',(1000,min(8,len(strips)-offset)*125),'#15191f')
        for i,s in enumerate(strips[offset:offset+8]): sheet.paste(s,(0,i*125))
        sheet.save(ROOT/f'artifacts/lob-fronts/title-masks-{offset//8}.png')
    print('Registered replacement PNG maps:',len(changed))


if __name__ == '__main__': run()
