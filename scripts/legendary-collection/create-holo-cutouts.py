"""Rasterize the user's two green LC subject traces and manually placed stars.

The supplied annotations are 600×825 and are never used as visible fronts.
Coverage, opaque subject protection and the registered star motif remain separate.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/cards/pokemon/legendary-collection'
MAPS = ASSETS / 'maps'
TRACES = Path(__file__).parent / 'traces'
STARS = json.loads((Path(__file__).parent / 'holo-star-placements.json').read_text())
REVIEW = ROOT / 'artifacts/legendary-collection-cutouts'
MAPS.mkdir(exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)

for key in ("6", "9"):
    placements = STARS[key]
    number = int(key)
    trace = np.array(Image.open(TRACES / f'{number}.png').convert('RGB'))
    clean = np.array(Image.open(ASSETS / f'{number}.png').convert('RGB'))
    assert trace.shape == clean.shape == (825, 600, 3)
    green = np.uint8(np.max(np.abs(trace.astype(int) - [34, 177, 76]), axis=2) < 10) * 255
    green[:90] = 0
    green[425:] = 0
    contours, _ = cv2.findContours(green, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = [contour for contour in contours if cv2.contourArea(contour) > 100]
    assert len(contours) == 1 and cv2.contourArea(contours[0]) > 40000, f'incomplete LC #{number} trace'

    scale = 2
    subject = np.zeros((1650, 1200), np.uint8)
    cv2.drawContours(subject, [contours[0] * scale], -1, 255, cv2.FILLED)
    # The green marker is several pixels thick; the inner edge protects ink
    # without carrying the marker into the optical mask.
    subject = cv2.erode(subject, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    subject = np.array(Image.fromarray(subject).filter(ImageFilter.GaussianBlur(.45)))
    window = np.zeros_like(subject)
    # Follow the inset edge of the printed evolution badge, as on Jungle's
    # stage-one holos. A rectangle would foil across that badge.
    vertices = [(143,98),(534,98),(534,421),(66,421),(66,140),(78,137),
        (86,144),(99,133),(111,136),(122,121),(133,116),(131,106)]
    cv2.fillPoly(window, [np.array(vertices, np.int32) * scale], 255)
    protection = np.maximum(subject, 255 - window)
    Image.fromarray(window).save(MAPS / f'{number}-holo-foil.png', optimize=True)
    Image.fromarray(protection).save(MAPS / f'{number}-holo-protection.png', optimize=True)
    Image.fromarray(np.uint8(56 + window.astype(float) / 255 * 72)).save(MAPS / f'{number}-holo-laminate.png', optimize=True)

    effective = window.astype(float) / 255 * (1 - protection.astype(float) / 255)
    background = np.array(Image.fromarray(clean).resize((1200, 1650), Image.Resampling.LANCZOS), dtype=float)
    overlay = np.uint8(background * (1 - effective[..., None] * .40) + np.array([0, 220, 255]) * effective[..., None] * .40)
    Image.fromarray(overlay).save(REVIEW / f'{number}-foil-overlay.png')
    print(f'LC #{number}: subject contour area {cv2.contourArea(contours[0]):.0f}')
