"""Preserve opaque footer glyphs on the photographed regular-holo silver rim.

The region is authored for Umbreon 059; thresholding is confined to that known
black-on-neutral-silver print area. This never detects foil or generates relief
from image luminance. The source front is unmodified.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/cards/pokemon/prismatic-evolutions'
with Image.open(ASSETS / '059.png') as image:
    front = np.array(image.convert('RGB'), dtype=np.float32)
protection = np.zeros(front.shape[:2], dtype=np.uint8)
# The neutral silver here is about 150/255; black glyph antialiasing is retained.
footer = front[804:818, 175:429].mean(axis=2)
protection[804:818, 175:429] = np.uint8(np.clip((150 - footer) / 140, 0, 1) * 255)
Image.fromarray(protection).resize((1200, 1650), Image.Resampling.LANCZOS).save(ASSETS / 'maps/059-holo-protection.png')
