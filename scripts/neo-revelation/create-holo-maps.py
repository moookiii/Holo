"""Use supplied SAM masks unchanged and existing Neo/Base Set 2 window geometry.
Cosmos placement is deferred at the user's request; explicit black motif maps
prevent default randomized dots while retaining clean master print and material.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/cards/pokemon/neo-revelation/maps'
OUT.mkdir(exist_ok=True)
records=json.loads((ROOT/'public/cards/pokemon/neo-revelation/catalog.json').read_text())['cards']
for card in records:
    if not card['variants']['holo']:continue
    n=card['localId']
    subject=Image.open(ROOT/f'scripts/neo-revelation/masks/{n}.png').convert('L')
    assert subject.size==(600,825)
    kind='evolved' if card.get('evolveFrom') else 'basic'
    window=Image.open(ROOT/f'scripts/neo-discovery/masks/{kind}-window.png').convert('L').resize((1200,1650),Image.Resampling.LANCZOS)
    protection=np.maximum(np.array(subject.resize((1200,1650),Image.Resampling.LANCZOS)),255-np.array(window))
    window.save(OUT/f'{n}-foil.png')
    Image.fromarray(protection).save(OUT/f'{n}-protection.png')
    # Preserve placements supplied in the next pass when regenerating masks.
    if not (OUT/f'{n}-cosmos.png').exists():Image.new('L',(1200,1650),0).save(OUT/f'{n}-cosmos.png')
