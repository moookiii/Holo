"""Fully populated optical slope/roughness field, NOT a coverage or etch map.

Every texel represents a distribution of microscopic foil normals. No point
placement, occupancy mask, thresholds or transparent gaps. Hardware mipmaps
integrate the field as the card recedes. The fixed seed is only used offline.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
rng = np.random.default_rng(151199)
h, w = 2048, 1472
noise = rng.uniform(-1, 1, (h, w, 3)).astype(np.float32)
# Small nearest-neighbour correlation avoids independent salt-and-pepper pixels.
# This optical field is unrelated to the unchanged TCGL etch geometry.
field = noise * .72
for axis in (0, 1):
    field += (np.roll(noise, 1, axis) + np.roll(noise, -1, axis)) * .07
pixels = np.empty((h, w, 4), dtype=np.uint8)
pixels[:, :, :3] = np.rint((.5 + field * .46) * 255).astype(np.uint8)
pixels[:, :, 3] = 255
path = root / 'public/materials/151-sir-micrograin.png'
Image.fromarray(pixels).save(path)
print(json.dumps(dict(file=str(path), dimensions=[w, h], seed=151199,
    minimum=pixels[:, :, :3].min(axis=(0, 1)).tolist(),
    maximum=pixels[:, :, :3].max(axis=(0, 1)).tolist(),
    opaquePixels=int(np.count_nonzero(pixels[:, :, 3] == 255)),
    sha256=hashlib.sha256(path.read_bytes()).hexdigest()), indent=2))
