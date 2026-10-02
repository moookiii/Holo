"""Register existing cutouts to the LC print window; never alter source maps.

The source window extent supplies an affine registration, not a new silhouette.
Both coverage and protection must move together: protection includes the opaque
area outside its original window and would otherwise retain the inset strip.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = Path(__file__).with_name('holo-registration.json')
OUT = ROOT / 'public/cards/pokemon/legendary-collection/maps'
REVIEW = ROOT / 'artifacts/lc-window-registration'
REVIEW.mkdir(parents=True, exist_ok=True)
for number, entry in json.loads(MANIFEST.read_text()).items():
    source = {key: Image.open(ROOT / ('public' + path)).convert('L')
              for key, path in entry['source'].items()}
    foil = np.array(source['foil'])
    effective_source = foil.astype(float) / 255
    if 'protection' in source:
        effective_source *= 1 - np.array(source['protection'], dtype=float) / 255
    ys, xs = np.where(effective_source > .5)
    crop = (int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1)
    left, top, right, bottom = [round(v*2) for v in entry['bounds']]
    size = (right-left, bottom-top)
    registered = {}
    for key, original in source.items():
        result = Image.new('L', (1200,1650), 255 if key == 'protection' else 56 if key == 'laminate' else 0)
        result.paste(original.crop(crop).resize(size, Image.Resampling.LANCZOS), (left,top))
        result.save(OUT / f'{number}-registered-{key}.png', optimize=True)
        registered[key] = np.array(result, dtype=float)/255
    effective = registered['foil'] * (1-registered.get('protection',0))
    clean = Image.open(ROOT / f'public/cards/pokemon/legendary-collection/{number}.png').convert('RGB').resize((1200,1650))
    rgb = np.array(clean,dtype=float)
    overlay = rgb*(1-effective[...,None]*.45)+np.array([0,255,190])*effective[...,None]*.45
    Image.fromarray(np.uint8(overlay)).crop((100,170,1100,880)).save(REVIEW / f'{number}.png')
    # Check actual nonzero coverage reaches each registered extent. Subject
    # islands and evolution-badge exclusions stay present in these maps.
    yy,xx = np.where(effective>.5)
    assert (xx.min(),yy.min(),xx.max()+1,yy.max()+1) == (left,top,right,bottom), number
    print(f'{number}: {crop} -> {(left,top,right,bottom)}')

# Preserve the user-authored evolution-box correction on every regeneration.
import runpy
runpy.run_path(str(Path(__file__).with_name("fix-evolution-badges.py")))
