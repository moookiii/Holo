"""Registered PNG masks. No optical shader changes and no synthetic card fronts.
Coordinates are measured against cached sources; low-resolution segmentation is
an estimate. Review contact sheets before accepting replacement scan registrations.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / 'public/cards/yugioh/lob-first-edition'
OUT = CARDS / 'maps'
OUT.mkdir(exist_ok=True)
rows = json.loads((ROOT / 'src/yugioh/sets/lob-data.json').read_text())
registration = {}
strips = []
for card in rows:
    number = card['number']
    front = Image.open(ROOT / ('public' + card['front'])).convert('RGB')
    w, h = front.size
    fallback = card['source']['fidelity'] != 'original-scan'
    art = [.122, .184, .878, .697] if fallback else [.140, .216, .857, .710]
    title = [.061, .043, .833, .097] if fallback else [.096, .073, .787, .122]
    stamp = [.918, .949, .958, .977]
    if number == 'LOB-000': art = [.148, .219, .848, .711]; title = [.096, .069, .785, .116]; stamp = [.918, .945, .971, .978]
    if number == 'LOB-015': art = [.139, .216, .865, .713]; title = [.088, .069, .795, .120]
    if number == 'LOB-053': art = [.128, .211, .861, .710]; title = [.083, .067, .791, .122]
    if number == 'LOB-061': art = [.14, .222, .856, .713]; title = [.086, .074, .792, .123]
    if number == 'LOB-062': art = [.137, .218, .860, .713]; title = [.088, .070, .785, .127]
    if number == 'LOB-067': art = [.144, .219, .859, .711]; title = [.094, .069, .790, .122]
    if number == 'LOB-070': art = [.136, .219, .859, .715]; title = [.089, .074, .788, .128]
    if number == 'LOB-107': art = [.136, .218, .869, .715]; title = [.09, .07, .797, .127]
    registration[number] = dict(artwork=art, title=title, stamp=stamp, sourceSize=[w,h], status='estimated-from-scan')
    def rect(mask, bounds, value):
        x0,y0,x1,y1 = bounds
        ImageDraw.Draw(mask).rectangle((round(x0*w),round(y0*h),round(x1*w)-1,round(y1*h)-1),fill=value)
    foil = Image.new('L', (w,h))
    if card['rarity'] in ('Super Rare','Ultra Rare','Secret Rare'): rect(foil, art, 255)
    foil.save(OUT / f'{number}-foil.png', optimize=True)
    security = Image.new('L', (w,h)); rect(security, stamp, 255)
    security.save(OUT / f'{number}-stamp.png', optimize=True)
    name = Image.new('L', (w,h))
    if card['rarity'] in ('Rare','Ultra Rare','Secret Rare'):
        box = tuple(round(v*(w if i%2 == 0 else h)) for i,v in enumerate(title))
        crop = front.crop(box).convert('L')
        a = np.array(crop,dtype=float)
        bg = np.array(crop.filter(ImageFilter.GaussianBlur(2.5)),dtype=float)
        # White lettering (spells/traps and secrets) vs dark recessed name ink.
        light = card['type'] in ('Spell Card','Trap Card') or card['rarity']=='Secret Rare'
        contrast = a-bg if light else bg-a
        ink = np.clip((contrast-5)/30,0,1)
        # Keep counters and antialiasing; no row-wide threshold or name-width guess.
        ink *= np.clip((a-90)/50,0,1) if light else np.clip((170-a)/70,0,1)
        name.paste(Image.fromarray(np.uint8(ink*255)),box[:2])
        strip = Image.new('RGB',(640,110),'#171b22')
        strip.paste(front.crop((0,0,w,round(h*.145))).resize((320,68)),(0,20))
        strip.paste(name.crop((0,0,w,round(h*.145))).convert('RGB').resize((320,68)),(320,20))
        ImageDraw.Draw(strip).text((5,2),number+' '+card['name'],fill='white');strips.append(strip)
    name.save(OUT / f'{number}-name.png', optimize=True)
    if card['rarity'] != 'Common':
        overlay = front.copy(); tint=Image.new('RGB',(w,h),(0,220,255)); overlay.paste(tint,(0,0),foil.point(lambda v: round(v*.25)))
        overlay.paste(Image.new('RGB',(w,h),(255,0,100)),(0,0),name)
        overlay.save(ROOT / f'artifacts/lob-{number}-overlay.png')
(ROOT/'src/yugioh/sets/lob-registration.json').write_text(json.dumps(registration,indent=2)+'\n')
sheet=Image.new('RGB',(1280,((len(strips)+1)//2)*110),'#171b22')
for i,strip in enumerate(strips): sheet.paste(strip,((i%2)*640,(i//2)*110))
sheet.save(ROOT/'artifacts/lob-title-review.png')

# Perspective registration of photographed original wrapper. Retain printed seals.
packs=ROOT/'public/packs/yugioh/lob-first-edition';packs.mkdir(parents=True,exist_ok=True)
front=Image.open(ROOT/'research/yugioh-lob/wrapper/front.jpg').convert('RGB')
front=front.transform((720,1200),Image.Transform.QUAD,(273,123,249,1350,1011,1368,972,130),Image.Resampling.BICUBIC)
front.save(packs/'front.png',optimize=True)
back=Image.open(ROOT/'research/yugioh-lob/wrapper/back.jpg').convert('RGB')
back=back.transform((1200,720),Image.Transform.QUAD,(50,351,39,994,1157,987,1153,319),Image.Resampling.BICUBIC).rotate(90,expand=True)
back.save(packs/'back.png',optimize=True)
for side in ('front','back'):
    ink=Image.new('L',(720,1200),170 if side=='front' else 210)
    d=ImageDraw.Draw(ink);d.rectangle((0,0,719,66),fill=20);d.rectangle((0,1115,719,1199),fill=20)
    if side=='back':d.rectangle((260,67,430,1114),fill=30)
    ink.save(packs/f'{side}-ink.png',optimize=True)
print('Prepared registered masks for',len(rows),'cards and wrapper PNGs')
