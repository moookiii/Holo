"""Use authoritative SAM masks unchanged; independently bound foil to print windows."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/cards/pokemon/neo-discovery/maps'
OUT.mkdir(exist_ok=True)
for n in range(1,18):
    subject=Image.open(ROOT/f'scripts/neo-discovery/masks/{n}.png').convert('L')
    assert subject.size==(600,825)
    kind='basic' if n in [5,7,11,14,16,17] else 'evolved'
    window=Image.open(ROOT/f'scripts/neo-discovery/masks/{kind}-window.png').convert('L').resize((1200,1650),Image.Resampling.LANCZOS)
    protection=np.maximum(np.array(subject.resize((1200,1650),Image.Resampling.LANCZOS)),255-np.array(window))
    window.save(OUT/f'{n}-foil.png')
    Image.fromarray(protection).save(OUT/f'{n}-protection.png')
