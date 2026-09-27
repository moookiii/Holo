"""Rasterize user-drawn green contours, not image brightness or inferred relief.

Input traces are unchanged 600x825 annotations. The clean TCGdex fronts remain
the visible artwork. Only explicitly supplied cards 1–6 are processed.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/cards/pokemon/jungle'
OUTPUT = ASSETS / 'maps'
REVIEW = ROOT / 'artifacts/jungle-cutouts'
OUTPUT.mkdir(exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)
SCALE = 2
# Inner picture rails and the printed evolution badge, in source coordinates.
WINDOWS = {
    1: [(143,97),(534,97),(534,421),(66,421),(66,141),(78,138),(86,144),(98,133),(111,136),(120,121),(132,117),(129,107)],
    2: [(142,95),(534,95),(534,421),(66,421),(66,139),(78,136),(85,142),(97,131),(109,134),(121,120),(131,114),(130,104)],
    3: [(143,95),(535,95),(535,422),(65,422),(65,140),(78,137),(85,144),(97,133),(111,136),(121,121),(132,116),(130,105)],
    4: [(142,94),(535,94),(535,420),(67,420),(67,138),(78,135),(86,142),(99,130),(111,133),(121,119),(132,114),(130,103)],
    5: [(66,97),(535,97),(535,422),(66,422)],
    6: [(64,95),(534,95),(534,420),(64,420)],
}
report = []
for number, vertices in WINDOWS.items():
    trace = np.array(Image.open(ROOT / f'scripts/jungle/traces/{number}.png').convert('RGB'))
    front = np.array(Image.open(ASSETS / f'{number}.png').convert('RGB'))
    assert trace.shape == front.shape == (825,600,3)
    # The exact Paint marker, allowing antialiasing. This extracts annotations,
    # not naturally green artwork. Small isolated matches are discarded.
    stroke = np.uint8(np.max(np.abs(trace.astype(int) - [34,177,76]), axis=2) < 10) * 255
    stroke[:90] = 0
    stroke[425:] = 0
    contours, _ = cv2.findContours(stroke, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = [c for c in contours if cv2.contourArea(c) > 40]
    assert max(map(cv2.contourArea, contours)) > 30000, f'Open/incomplete contour: {number}'
    body = np.zeros((1650,1200), np.uint8)
    cv2.drawContours(body, [c*SCALE for c in contours], -1, 255, cv2.FILLED)
    # Resolve the thick drawn line near its center, not at its outer edge.
    # Electrode's supplied stroke is thinner than the other five annotations.
    inset = 2 if number == 2 else 4
    body = cv2.erode(body, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*inset+1,2*inset+1)))
    body = np.array(Image.fromarray(body).filter(ImageFilter.GaussianBlur(.45)))
    window = np.zeros_like(body)
    cv2.fillPoly(window, [np.array(vertices, np.int32)*SCALE], 255)
    protection = np.maximum(body, 255-window)
    Image.fromarray(window).save(OUTPUT / f'{number}-foil.png', optimize=True)
    Image.fromarray(protection).save(OUTPUT / f'{number}-protection.png', optimize=True)
    laminate = np.uint8(56 + window.astype(float)/255*72)
    Image.fromarray(laminate).save(OUTPUT / f'{number}-laminate.png', optimize=True)
    effective = window.astype(float)/255 * (1-protection.astype(float)/255)
    clean = np.array(Image.fromarray(front).resize((1200,1650), Image.Resampling.LANCZOS),dtype=float)
    alpha = effective[...,None]*.36
    overlay = np.uint8(clean*(1-alpha)+np.array([0,220,255])*alpha)
    # Full resolution review shows the actual foil boundary, including fingers,
    # fur tips, background gaps, picture rails and the evolution badge.
    Image.fromarray(overlay).save(REVIEW / f'{number}-overlay.png')
    Image.fromarray(np.uint8(effective*255)).save(REVIEW / f'{number}-effective.png')
    report.append({'number': number, 'protectedPixels': int(np.count_nonzero(body>127)),
                   'foilPixels': int(np.count_nonzero(effective>.5)), 'contours': len(contours)})
(REVIEW/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
