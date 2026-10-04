"""Compose independent coverage/protection PNGs; never infer relief from print."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageOps, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/cards/pokemon/neo-destiny/maps'
OUT.mkdir(exist_ok=True)
records=json.loads((ROOT/'public/cards/pokemon/neo-destiny/catalog.json').read_text())['cards']
contours=json.loads((ROOT/'scripts/neo-destiny/shining-contours.json').read_text(encoding='utf8'))
for card in records:
    if not card['variants']['holo']:continue
    n=card['localId']
    supplied=Image.open(ROOT/f'scripts/neo-destiny/masks/{n}.png').convert('L')
    assert supplied.size==(600,825)
    supplied=supplied.resize((1200,1650),Image.Resampling.LANCZOS)
    if int(n)>=106:
        # Black subject on white print: foil only on the subject, no artwork window.
        foil=ImageOps.invert(supplied)
        if n in contours:
            authored=Image.new('L',(2400,3300),0)
            ImageDraw.Draw(authored).polygon([(round(x*4),round(y*4)) for x,y in contours[n]['reflectiveSubject']],fill=255)
            foil=authored.resize((1200,1650),Image.Resampling.LANCZOS)
        # The subject reaches the top/right of Noctowl's art. Keep the printed
        # picture rails, border, name, symbols and rules entirely non-foil.
        bounds=Image.new('L',(1200,1650),0)
        ImageDraw.Draw(bounds).rectangle((126,190,1073,847),fill=255)
        foil=Image.fromarray(np.minimum(np.array(foil),np.array(bounds)))
        foil.save(OUT/f'{n}-foil.png')
        ImageOps.invert(foil).save(OUT/f'{n}-protection.png')
    else:
        kind='evolved' if card.get('evolveFrom') else 'basic'
        window=Image.open(ROOT/f'scripts/neo-discovery/masks/{kind}-window.png').convert('L').resize((1200,1650),Image.Resampling.LANCZOS)
        if card.get('category')=='Energy':
            window=Image.new('L',(1200,1650),0)
            from PIL import ImageDraw
            ImageDraw.Draw(window).rectangle((40,238,1155,1211),fill=255)
        window.save(OUT/f'{n}-foil.png')
        Image.fromarray(np.maximum(np.array(supplied),255-np.array(window))).save(OUT/f'{n}-protection.png')
        if not (OUT/f'{n}-cosmos.png').exists():Image.new('L',(1200,1650),0).save(OUT/f'{n}-cosmos.png')
