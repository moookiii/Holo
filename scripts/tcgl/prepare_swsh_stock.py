"""Preserve authentic TCGL shared optical stock. Never use it as etched relief."""
from pathlib import Path
import argparse
import hashlib
import json
import UnityPy
import numpy as np
import cv2
from PIL import Image
from prepare_swsh_proofs import registered

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--bundle', type=Path, required=True)
args = parser.parse_args()
out = ROOT / 'public/cards/pokemon/swsh-proofs/stock'
out.mkdir(parents=True, exist_ok=True)
source = ROOT / 'research/tcgl/swsh-shared-stock'
source.mkdir(parents=True, exist_ok=True)
records = []
for obj in UnityPy.load(str(args.bundle)).objects:
    if obj.type.name != 'Texture2D':
        continue
    texture = obj.read()
    if texture.m_Name != 'T_Holofoil_Mask_RadiantHolo_RG_X_Grad_5':
        continue
    raw = source / (texture.m_Name + '.png')
    texture.image.save(raw)
    target = out / 'radiant-field.png'
    # Physical Greninja shows diagonal diamonds, not an upright square grid.
    # Rotate the optical stock in physical card coordinates, never its etch.
    y, x = np.mgrid[0:1238, 0:900].astype(np.float32)
    x = (x / 899 - .5) * (6.3 / 8.8)
    y = y / 1237 - .5
    u = ((x + y) / np.sqrt(2) + .5) * 1024
    v = ((y - x) / np.sqrt(2) + .5) * 1024
    field = cv2.remap(np.asarray(texture.image.convert('RGBA')), u.astype(np.float32), v.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    Image.fromarray(field).save(target)
    records.append({'name': texture.m_Name, 'pathID': obj.path_id,
        'sourceDimensions': [texture.m_Width, texture.m_Height],
        'sourceSha256': hashlib.sha256(raw.read_bytes()).hexdigest(),
        'outputSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
        'material': 'MAT_Cards3D_RadiantHolo', 'property': '_CrossTexture',
        'transform': '45 degree optical-stock rotation in physical card coordinates, bilinear periodic extension; no etch transformation',
        'interpretation': 'RG crossed optical inclination, not height or measured physical normal',
        'calibration': 'provisional angular width; reviewed against physical Greninja tilt'})
if len(records) != 1:
    raise ValueError('Expected exactly one Radiant stock texture')
(out / 'evidence.json').write_text(json.dumps({'bundleSha256': hashlib.sha256(args.bundle.read_bytes()).hexdigest(), 'textures': records}, indent=2) + '\n')
