from pathlib import Path
from PIL import Image
import numpy as np
root = Path(__file__).resolve().parents[2] / 'public/cards/pokemon/legendary-collection/maps'
for n in (10, 35):
    mask = np.array(Image.open(root / f'{n}-reverse-protection.png'))
    assert mask[35:50, 25:35].max() < 32, f'{n}: stock left of badge must remain foil'
    assert mask[60:80, 55:110].min() > 240, f'{n}: evolution portrait must be protected'
flareon = np.array(Image.open(root / '10-reverse-protection.png'))
assert np.mean(flareon[765:780, 460:520] > 180) < .25, 'fire stock must not become solid protection'
print('Flareon and Rhydon badge/background regression checks passed')
