"""Adapt original TCGL confetti labels to Holo's existing Classic optical field.

This encodes optical axes, never relief. Positions and shapes come from TCGL.
The hue-to-axis interpretation is provisional, not a physical measurement.
"""
from pathlib import Path
import argparse
import hashlib
import json
import colorsys
import numpy as np
import UnityPy
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--bundle', type=Path, required=True)
args = parser.parse_args()
source = ROOT / 'research/tcgl/swsh-shared-stock'
out = ROOT / 'public/cards/pokemon/swsh-proofs/stock'
source.mkdir(parents=True, exist_ok=True)
out.mkdir(parents=True, exist_ok=True)
objects = [o for o in UnityPy.load(str(args.bundle)).objects if o.path_id == -2035113661446329272]
assert len(objects) == 1
t = objects[0].read()
assert t.m_Name == 'FX_T_Celeb_Confetti'
raw = source / (t.m_Name + '.png')
t.image.save(raw)
rgb = np.asarray(t.image.convert('RGB'))
colors, indices = np.unique(rgb.reshape(-1, 3), axis=0, return_inverse=True)
hues = np.array([colorsys.rgb_to_hsv(*(c / 255))[0] for c in colors])
axes = hues * np.pi
encoded = np.stack((.5 + .5*np.cos(2*axes), .5 + .5*np.sin(2*axes), np.full_like(axes, .5), np.ones_like(axes)), axis=1)
field = np.rint(encoded[indices].reshape((*rgb.shape[:2], 4))*255).astype(np.uint8)
# Centered physical aspect crop keeps circles round on the card. No RNG,
# repeated procedural cells or inferred card-specific feature locations.
im = Image.fromarray(field)
width = round(im.height * 6.3/8.8)
left = (im.width-width)//2
target = out / 'classic-field.png'
im.crop((left, 0, left+width, im.height)).resize((900, 1238), Image.Resampling.BILINEAR).save(target)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
(out / 'classic-evidence.json').write_text(json.dumps({
    'material': 'MAT_Cards3D_Celebrations', 'property': '_TexDots',
    'texture': t.m_Name, 'pathID': objects[0].path_id,
    'sourceDimensions': [t.m_Width, t.m_Height], 'sourceSha256': sha(raw),
    'bundleSha256': sha(args.bundle), 'outputSha256': sha(target),
    'transform': {'crop': [left, 0, left+width, im.height], 'output': [900,1238],
        'axis': 'source hue * pi encoded as doubled-angle RG', 'periodChannel': .5},
    'status': 'provisional optical interpretation; exact TCGL motif geometry; no height generation'
}, indent=2)+'\n')
