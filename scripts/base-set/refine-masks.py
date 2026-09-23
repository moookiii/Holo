"""Offline edge registration of hand-authored contours; never runtime segmentation.

Graph-cut may expand six pixels or contract one pixel about each authored
contour. Deep interiors, fine appendages and artwork boundaries stay constrained.
This removes scan fringes and follows ink edges between the authored anchors.
Input: create-base-set-maps.mjs, then render-masks.mjs. Output: final foil.png.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
cv2.setRNGSeed(1999)
cards = json.loads((ROOT / 'artifacts/base-set/contours.json').read_text())
for card in cards:
    number = card['number']
    key = f'{number:02}'
    folder = ROOT / ('public/cards/charizard-base-set' if number == 4 else f"public/cards/pokemon/base-set/{card['slug']}")
    front = np.array(Image.open(folder / 'front.png').convert('RGB'))
    seed = np.array(Image.open(ROOT / f'artifacts/base-set/masks/{key}-seed.png').convert('L')) > 127
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13,13))
    core = cv2.erode(seed.astype('uint8'), np.ones((3,3), np.uint8)).astype(bool)
    distance = cv2.distanceTransform(seed.astype('uint8'), cv2.DIST_L2, 3)
    # Fine wires, whiskers and feather tips must never disappear in segmentation.
    core |= seed & (cv2.dilate(distance, np.ones((3,3), np.uint8)) < 1.6)
    envelope = cv2.dilate(seed.astype('uint8'), kernel).astype(bool)
    labels = np.zeros(seed.shape, np.uint8)
    labels[envelope] = cv2.GC_PR_BGD
    labels[seed] = cv2.GC_PR_FGD
    labels[core] = cv2.GC_FGD
    cv2.grabCut(front[99:425,63:539].copy(), labels[99:425,63:539], None,
                np.zeros((1,65)), np.zeros((1,65)), 4, cv2.GC_INIT_WITH_MASK)
    subject = ((labels == cv2.GC_FGD) | (labels == cv2.GC_PR_FGD)).astype('uint8')
    # Retain printed boundary antialiasing and black keylines. This is less than
    # one original scan pixel, rather than a loose halo around the silhouette.
    subject = cv2.resize(subject.astype('float32'), (1200,1650), interpolation=cv2.INTER_LINEAR)
    subject = cv2.dilate(subject, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3,3)))
    # Rasterized foil provides the exact authored artwork window (and its badge
    # notch). Fill internal holes only for constructing that window, not subject.
    art = np.zeros((1650,1200), np.uint8)
    art[200:846,128:1074] = 255
    if card['stage']:
        # Window contour, registered to the original scan's evolution badge.
        vertices = np.array([[132,100],[537,100],[537,423],[64,423],[64,147],
                             [73,141],[82,145],[95,134],[104,133],[113,117]]) * 2
        art[:] = 0
        cv2.fillPoly(art, [vertices], 255)
    foil = np.uint8(np.clip(art.astype(float) * (1-subject),0,255))
    veil = np.array(Image.open(ROOT / f'artifacts/base-set/masks/{key}-veil.png').convert('L')) / 255
    # The blue-edged Charizard breath is translucent in the original print:
    # retain its ink while permitting the underlying star sheet to respond.
    foil = np.uint8(np.rint(foil * (1-.28*veil)))
    Image.fromarray(foil).save(folder / 'foil.png', optimize=True)
    laminate = np.uint8(np.rint(56 + (art/255)*56 + (foil/255)*48))
    Image.fromarray(laminate).save(folder / 'laminate.png', optimize=True)
    Image.fromarray(foil).save(ROOT / f'artifacts/base-set/masks/{key}-final.png')
    print(f"{key} {card['name']}: registered subject edges")
