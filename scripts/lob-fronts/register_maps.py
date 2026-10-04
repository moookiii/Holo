"""Align existing PNG material maps with published front replacements only.
No optical settings, relief or Secret Rare assets are changed. Rectangle bounds
remain physical registration estimates; title masks use individual glyphs.
"""
import argparse
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pipeline import ROOT, PUBLIC, write_json, write_png


def title_mask(front, bounds, metallic_silver, solid_letters=False):
    w, h = front.size
    box = tuple(round(v * (w if i % 2 == 0 else h)) for i, v in enumerate(bounds))
    crop = front.crop(box).convert('L')
    if solid_letters:
        # These individually reviewed scans have a uniformly colored title plate.
        # Segment dark letter bodies and neutral silver edging in the tight
        # per-card glyph bounds, retaining counters and the Hane-Hane hyphen.
        rgb = np.array(front.crop(box).filter(ImageFilter.GaussianBlur(.55)),dtype=float)
        lum = .299*rgb[:,:,0]+.587*rgb[:,:,1]+.114*rgb[:,:,2]
        if solid_letters == 'silver-blue':
            coverage = ((rgb[:,:,2] > rgb[:,:,0]-12) &
                        ((lum < 160) | ((rgb[:,:,0]-rgb[:,:,1]) < 35)))
        else:
            coverage = lum < (105 if solid_letters == 'dark' else 100)
        count,labels,stats,_ = cv2.connectedComponentsWithStats(coverage.astype('uint8'),8)
        keep = np.zeros(coverage.shape,dtype=bool)
        for i in range(1,count):
            if (stats[i,cv2.CC_STAT_AREA] >= 12 and stats[i,cv2.CC_STAT_HEIGHT] >= 3
                    and stats[i,cv2.CC_STAT_WIDTH] < rgb.shape[1]*.8):
                keep |= labels == i
        glyphs = Image.fromarray(keep.astype('uint8')*255).filter(ImageFilter.GaussianBlur(.35))
        result = Image.new('L',(w,h));result.paste(glyphs,box[:2]);return result
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


def run(only=None):
    rows = json.loads((ROOT/'src/yugioh/sets/lob-data.json').read_text(encoding='utf-8'))
    path = ROOT/'src/yugioh/sets/lob-registration.json'
    registrations = json.loads(path.read_text(encoding='utf-8'))
    provenance = {c['number']: json.loads((PUBLIC/f"{c['number']}.json").read_text(encoding='utf-8')) for c in rows if '/fronts/' in c['front']}
    strips = []
    changed = []
    for card in rows:
        if (only and card['number'] not in only) or '/fronts/' not in card['front']:
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
        record = provenance[n]
        candidate = next(c for c in record['candidates'] if c['id'] == record['imageProvenance']['candidateId'])
        authored = candidate.get('registration', {})
        art = authored.get('artwork',art)
        title = authored.get('title',title)
        stamp = authored.get('stamp',stamp)
        registrations[n] = {**old, 'artwork': art, 'title': title, 'stamp': stamp,
            'sourceSize': [w, h], 'status': 'estimated-from-replacement-front',
            'front': card['front']}
        if authored.get('mapCrop'):
            spec = authored['mapCrop']
            for suffix in ['foil','name','stamp']:
                source = Image.open(ROOT/spec['root']/(suffix+'.png'))
                if list(source.size) != spec['originalSize']:
                    raise ValueError('Original mask size changed: '+n)
                mask = source.crop(spec['bounds'])
                if mask.size != front.size: raise ValueError('Crop registration mismatch: '+n)
                write_png(PUBLIC/'maps'/f'{n}-{suffix}.png',mask)
            changed.append(n)
            continue
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
            name = title_mask(front, title, silver, authored.get('titleInk') if authored.get('titleMaskMethod') == 'solid-glyphs' else False)
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


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cards',nargs='+',help='Regenerate only these card codes')
    run(parser.parse_args().cards)
