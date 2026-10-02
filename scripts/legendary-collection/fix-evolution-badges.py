"""Apply the user's corrected Dark Blastoise badge without retracing subjects.

Template is an exact crop of the GIMP-edited protection PNG, at (130,194).
Only the old/new badge boundary strip changes; artwork cutouts remain intact.
Run after register-holo-windows.py when regenerating regular holo maps.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MAPS = ROOT / 'public/cards/pokemon/legendary-collection/maps'
TEMPLATE = np.array(Image.open(Path(__file__).with_name('traces') / 'evolution-badge.png').convert('L'))
EVOLVED = [1,3,4,5,6,7,8,9,10,11,12,14,15,16,17,18]
REVIEW = ROOT / 'artifacts/lc-evolution-badges'
REVIEW.mkdir(parents=True, exist_ok=True)
for number in EVOLVED:
    foil_path = MAPS / f'{number}-registered-foil.png'
    protection_path = MAPS / f'{number}-registered-protection.png'
    foil = np.array(Image.open(foil_path).convert('L'))
    protection = np.array(Image.open(protection_path).convert('L')) if protection_path.exists() else None
    before = foil.copy()
    for local_y, row in enumerate(TEMPLATE):
        y = 194 + local_y
        # First opening along each row identifies the badge's right edge.
        # Ignore lower rows once the badge ends, leaving all subject islands.
        new_edge = int(np.flatnonzero(row > 0)[-1])+1 if np.any(row > 0) else 0
        old_row = before[y,130:310]
        old_edge = int(np.argmax(old_row > 127)) if np.any(old_row > 127) else 0
        if new_edge == 0 and old_edge == 0:
            continue
        end = min(180, max(new_edge, old_edge) + 20)
        badge = np.zeros(end, dtype=np.uint8)
        badge[:min(end,len(row))] = row[:min(end,len(row))]
        foil[y,130:130+end] = 255-badge
        if protection is not None:
            protection[y,130:130+end] = badge
    Image.fromarray(foil).save(foil_path, optimize=True)
    if protection is not None:
        Image.fromarray(protection).save(protection_path, optimize=True)
    effective = foil.astype(float)/255 * (1-protection.astype(float)/255 if protection is not None else 1)
    clean = np.array(Image.open(ROOT / f'public/cards/pokemon/legendary-collection/{number}.png').convert('RGB').resize((1200,1650)),dtype=float)
    overlay = clean*(1-effective[...,None]*.45)+np.array([0,255,180])*effective[...,None]*.45
    Image.fromarray(np.uint8(overlay)).crop((110,170,340,330)).resize((690,480)).save(REVIEW / f'{number}.png')
    # No modifications outside the small badge neighborhood.
    changed = before != foil
    changed[194:300,130:310] = False
    assert not changed.any()
    print(number)
