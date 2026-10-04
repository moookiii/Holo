"""Compose supplied print protection and inverse Shining subject masks.
No shader, Cosmos placements, relief, brightness segmentation, or new geometry.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/cards/pokemon/neo-destiny/maps'
OUT.mkdir(exist_ok=True)
records=json.loads((ROOT/'public/cards/pokemon/neo-destiny/catalog.json').read_text())['cards']
for card in records:
    if not card['variants']['holo']:continue
    n=card['localId']
    supplied=Image.open(ROOT/f'scripts/neo-destiny/masks/{n}.png').convert('L')
    assert supplied.size==(600,825)
    supplied=supplied.resize((1200,1650),Image.Resampling.LANCZOS)
    if int(n)>=106:
        # Black subject on white print: foil only on the subject, no artwork window.
        ImageOps.invert(supplied).save(OUT/f'{n}-foil.png')
        supplied.save(OUT/f'{n}-protection.png')
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
