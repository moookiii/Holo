"""Refine Umbreon 161 normals for the crown foil and Stage 1 icon.

The supplied foil mask controls material coverage only. Normal derivatives are
computed on continuous fields before those fields are blended into the map.
"""
from pathlib import Path
import hashlib
import json

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
MAPS = ROOT / 'public/cards/pokemon/prismatic-evolutions/maps'
SCALE = 3


def main():
    path = MAPS / '161-holo-normal.png'
    normal = np.asarray(Image.open(path).convert('RGB'), dtype=np.float32) / 255 * 2 - 1
    foil = np.asarray(Image.open(MAPS / '161-holo-secondary-foil.png').convert('L'), dtype=np.float32) / 255
    height, width = foil.shape

    # A sparse array of shallow, square cut facets. Jitter and omission are
    # deterministic, while each facet remains compact and manufactured-looking.
    # The field exists under the entire crown; masking it before differentiation
    # would create a false raised outline around every shard.
    y0, y1, x0, x1 = 380, 970, 430, 1400
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32) / SCALE
    pitch = 1.8
    rows = np.floor(yy / pitch).astype(np.int32)
    cols = np.floor(xx / pitch).astype(np.int32)
    u = xx / pitch - cols - .5
    v = yy / pitch - rows - .5
    seed = ((rows * 92837111) ^ (cols * 689287499)) & 0x7fffffff
    active = (seed % 17) < 6
    jitter_x = ((seed >> 5) % 101) / 101 - .5
    jitter_y = ((seed >> 12) % 103) / 103 - .5
    qx = np.maximum(0, 1 - np.abs((u - .22 * jitter_x) / .30))
    qy = np.maximum(0, 1 - np.abs((v - .22 * jitter_y) / .30))
    facets = (qx * qy) ** 2 * active
    facets = cv2.GaussianBlur(facets.astype(np.float32), (0, 0), .65)
    fy, fx = np.gradient(facets, 1 / SCALE, 1 / SCALE)
    crown = np.stack((-fx * .055, fy * .055, np.ones_like(fx)), axis=2)
    crown /= np.linalg.norm(crown, axis=2, keepdims=True)
    # A subpixel blend avoids pinning a dark rim to an antialiased foil edge.
    blend = cv2.GaussianBlur(foil[y0:y1, x0:x1], (0, 0), 1.15)[..., None]
    normal[y0:y1, x0:x1] = normal[y0:y1, x0:x1] * (1 - blend) + crown * blend

    # The small silver Stage 1 medallion has a broad, smooth raised rim. The
    # neighboring printed face stays smooth; no print brightness drives height.
    y0, y1, x0, x1 = 155, 460, 0, 355
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32) / SCALE
    radial = np.sqrt(((xx - 53) / 47) ** 2 + ((yy - 106) / 43) ** 2)
    rim_height = 1.1 * np.exp(-((radial - .90) / .075) ** 2)
    hy, hx = np.gradient(rim_height, 1 / SCALE, 1 / SCALE)
    rim = np.stack((-hx * .075, hy * .075, np.ones_like(hx)), axis=2)
    rim /= np.linalg.norm(rim, axis=2, keepdims=True)
    rim_weight = np.clip((radial - .79) / .045, 0, 1) * np.clip((1.025 - radial) / .045, 0, 1)
    rim_weight = cv2.GaussianBlur(rim_weight.astype(np.float32), (0, 0), 1.3)[..., None]
    normal[y0:y1, x0:x1] = normal[y0:y1, x0:x1] * (1 - rim_weight) + rim * rim_weight

    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    rgba = np.dstack((np.rint(np.clip(normal * .5 + .5, 0, 1) * 255).astype(np.uint8),
                      np.full((height, width), 255, dtype=np.uint8)))
    Image.fromarray(rgba).save(path)
    evidence_path = MAPS / '161-holo-evidence.json'
    evidence = json.loads(evidence_path.read_text(encoding='utf8'))
    for name in ('normal', 'secondary-foil', 'protection'):
        file = MAPS / f'161-holo-{name}.png'
        evidence['maps'][file.name] = hashlib.sha256(file.read_bytes()).hexdigest()
    evidence['normalRefinement'] = 'Sparse shallow square facets in user supplied secondary foil; smooth raised Stage 1 medallion rim. Spacing and depth are estimates from the supplied close-ups.'
    evidence_path.write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf8')


if __name__ == '__main__':
    main()
