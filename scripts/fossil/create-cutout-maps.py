"""Rasterize user-drawn green contours, not image brightness or inferred relief.

Input traces are unchanged 600x825 annotations. The clean TCGdex fronts remain
the visible artwork. All fifteen explicitly supplied outlines are processed.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/cards/pokemon/fossil'
OUTPUT = ASSETS / 'maps'
REVIEW = ROOT / 'artifacts/fossil-cutouts'
OUTPUT.mkdir(exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)
SCALE = 2
# Inner picture rails and the printed evolution badge, in source coordinates.
EVOLVED = {1,4,5,6,8,9,11,13,14}
WINDOWS = {n: ([(142,94),(537,94),(537,421),(62,421),(62,139),(74,135),(84,142),(97,130),(109,134),(121,119),(132,114),(130,104)]
    if n in EVOLVED else [(62,94),(537,94),(537,421),(62,421)]) for n in range(1,16)}
# Background holes explicitly enclosed by the supplied contours.
HOLES = {1:[(342,307)],2:[(382,331)],8:[(235,285)],
         14:[(433,318)],15:[(244,312),(326,324),(339,284),(194,287)]}
report = []
for number, vertices in WINDOWS.items():
    trace = np.array(Image.open(ROOT / f'scripts/fossil/traces/{number}.png').convert('RGB'))
    front = np.array(Image.open(ASSETS / f'{number}.png').convert('RGB'))
    assert trace.shape == front.shape == (825,600,3)
    # The exact Paint marker, allowing antialiasing. This extracts annotations,
    # not naturally green artwork. Small isolated matches are discarded.
    stroke = np.uint8(np.max(np.abs(trace.astype(int) - [34,177,76]), axis=2) < 10) * 255
    stroke[:90] = 0
    stroke[425:] = 0
    if number == 9:
        cv2.line(stroke,(164,355),(172,369),255,4)
        cv2.polylines(stroke,[np.array([(302,282),(310,293),(320,301),(325,281)],np.int32)],False,255,4)
        stroke = cv2.morphologyEx(stroke, cv2.MORPH_CLOSE, np.ones((3,3),np.uint8))
    if number == 15:
        # Close the unmarked short contour between the left wing and claw.
        cv2.line(stroke,(175,245),(178,261),255,4)
    contours, _ = cv2.findContours(stroke, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = [c for c in contours if cv2.contourArea(c) > 40]
    assert max(map(cv2.contourArea, contours)) > 20000, f'Open/incomplete contour: {number}'
    body = np.zeros((1650,1200), np.uint8)
    cv2.drawContours(body, [c*SCALE for c in contours], -1, 255, cv2.FILLED)
    nested, _ = cv2.findContours(stroke, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    for point in HOLES.get(number,[]):
        candidates = [c for c in nested if cv2.pointPolygonTest(c,point,False)>0]
        assert candidates, (number,point)
        cv2.drawContours(body,[min(candidates,key=cv2.contourArea)*SCALE],-1,0,cv2.FILLED)
    # Resolve the thick drawn line near its center, not at its outer edge.
    inset = 4
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
