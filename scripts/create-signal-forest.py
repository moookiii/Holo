"""Build registered material fields; never alter the decoded source artwork.

Requires Pillow, numpy, scipy, opencv-python, scikit-image. Run from any cwd.
The engraving die is geometry: simplified source-feature polylines and dot
centres, stroked with a constant section. No luminance-to-height conversion.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil

import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, distance_transform_edt
from skimage.morphology import skeletonize

ROOT = Path(__file__).resolve().parents[1]
MAP_W, MAP_H = 1536, 3072
CARDS = [
    ('signal-arbor', 'Signal Arbor', '63f86fee8a81d7ef199fada362c4b97a.jpg', 24),
    ('recursive-gate', 'Recursive Gate', 'f69cd2593927f2bb5a83e37efe1f5302.jpg', 16),
]


def smooth(a, b, value):
    t = np.clip((value - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def save(folder, name, data):
    Image.fromarray(np.uint8(np.clip(np.rint(data * 255), 0, 255))).save(folder / f'{name}.png', optimize=True)


def build(card, source_dir):
    id, title, filename, pad = card
    folder = ROOT / 'public/cards' / id
    folder.mkdir(parents=True, exist_ok=True)
    source = source_dir / filename if source_dir else folder / 'source.jpg'
    if source_dir:
        shutil.copyfile(source, folder / 'source.jpg')
    original = Image.open(source).convert('RGB')
    w, h = original.size
    cw, ch = w + pad * 2, h + pad * 4
    front = Image.new('RGB', (cw, ch), (1, 3, 3))
    front.paste(original, (pad, pad * 2))
    front.save(folder / 'front.png', optimize=True)
    assert np.array_equal(np.asarray(front)[pad*2:pad*2+h, pad:pad+w], np.asarray(original))

    rgb = np.asarray(original).astype(np.float32) / 255
    y, x = np.mgrid[:h, :w].astype(np.float32)
    u, v = x / w, y / h
    # Pigment classification is used only to locate source features/protect ink.
    # A local top-hat separates the existing thin data marks from broad foliage.
    chroma = rgb.max(2) - rgb.min(2)
    feature = np.maximum(chroma, rgb.max(2) * .64)
    opened = cv2.morphologyEx(feature, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    marks = ((feature - opened) > .115) & (rgb.max(2) > .22)
    token_zone = (u < .115) if id == 'signal-arbor' else ((u > .84) | (u < .068))
    # Glyph-like side data stays ink, including its individual antialiased edges.
    marks[token_zone] = False
    skeleton = skeletonize(marks)
    n, labels, stats, centroids = cv2.connectedComponentsWithStats(skeleton.astype(np.uint8), 8)
    strokes = np.zeros((MAP_H, MAP_W), np.uint8)
    dots = np.zeros_like(strokes)
    foliage = np.zeros_like(strokes)
    sx, sy = MAP_W / cw, MAP_H / ch

    def transform(points):
        p = np.asarray(points, dtype=np.float32).reshape(-1, 2)
        return np.rint((p + [pad, pad * 2]) * [sx, sy]).astype(np.int32)

    lines = 0
    dot_count = 0
    # Connected centreline traces become simplified vector polylines. Their
    # relief amplitude is identical regardless of the original line brightness.
    for i in range(1, n):
        left, top, ww, hh, area = stats[i]
        if area < 2:
            continue
        if area < 9 and ww <= 6 and hh <= 7:
            cx, cy = transform([centroids[i]])[0]
            cv2.ellipse(dots, (int(cx), int(cy)), (1, 2), 0, 0, 360, 255, -1, cv2.LINE_AA)
            dot_count += 1
            continue
        if area < 8:
            continue
        component = np.uint8(labels[top:top+hh, left:left+ww] == i)
        contours, _ = cv2.findContours(component, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
        for contour in contours:
            if len(contour) < 6:
                continue
            path = cv2.approxPolyDP(contour, .32, False).reshape(-1, 2) + [left, top]
            cv2.polylines(strokes, [transform(path)], False, 255, 1, cv2.LINE_AA)
            lines += 1

    # Natural tree/fern boundaries, traced independently from the digital marks.
    # Smooth first and reject tiny contours so JPEG texture cannot become relief.
    gray = cv2.cvtColor(np.uint8(rgb * 255), cv2.COLOR_RGB2GRAY)
    tree_edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 1.1), 28, 70)
    canopy = ((v < .32) | (v > .845)) if id == 'signal-arbor' else ((v > .12) & (v < .55) & (u > .08) & (u < .79))
    tree_edges[~canopy | token_zone] = 0
    contours, _ = cv2.findContours(tree_edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    tree_lines = 0
    for contour in contours:
        if cv2.arcLength(contour, False) < 30:
            continue
        path = cv2.approxPolyDP(contour, .55, False)
        cv2.polylines(foliage, [transform(path)], False, 255, 1, cv2.LINE_AA)
        tree_lines += 1

    # Continuous rounded die sections, constructed before any material clipping.
    # Fine paired shoulders flank the traced paths, like a shallow engraved cut.
    distance = distance_transform_edt(strokes < 64)
    cut = np.exp(-.5 * (distance / .72) ** 2)
    shoulders = np.exp(-.5 * ((distance - 1.5) / .66) ** 2)
    tree_distance = distance_transform_edt(foliage < 64)
    tree_cut = np.exp(-.5 * (tree_distance / .85) ** 2)
    dot_die = gaussian_filter(dots.astype(np.float32) / 255, .62)
    height = .5 - .15 * cut + .05 * shoulders - .065 * tree_cut + .10 * dot_die
    gy, gx = np.gradient(height)
    normals = np.dstack((-gx * 5.5, gy * 5.5, np.ones_like(height)))
    normals /= np.linalg.norm(normals, axis=2, keepdims=True)
    normal = normals * .5 + .5

    def registered(field, outside=0):
        canvas = np.full((ch, cw), outside, np.float32)
        canvas[pad*2:pad*2+h, pad:pad+w] = field
        return cv2.resize(canvas, (MAP_W, MAP_H), interpolation=cv2.INTER_LINEAR)

    # Separate foil and opaque-ink maps: deep black stays black; colored mark
    # edges are antialiased, with no rectangular glyph-protection patches.
    pigment = rgb.max(2)
    ink = 1 - smooth(.035, .18, pigment)
    glyphs = smooth(.035, .12, pigment) * token_zone
    protection = registered(np.maximum(ink, glyphs), outside=1)
    line_foil = np.exp(-.5 * (distance / 1.5) ** 2)
    leaf_foil = np.exp(-.5 * (tree_distance / 1.4) ** 2)
    foil = np.clip(.76 * line_foil + .27 * leaf_foil + .54 * dot_die, 0, .9)
    roughness = .48 - .24 * cut - .075 * tree_cut - .12 * dot_die
    laminate = .19 + .13 * cut + .07 * tree_cut
    pattern = np.maximum(line_foil, np.maximum(leaf_foil * .6, dot_die))
    zero = np.zeros_like(height)
    for name, field in {
        'foil': foil, 'protection': protection, 'height': height,
        'normal': normal, 'roughness': roughness, 'laminate': laminate,
        'pattern': pattern, 'sparkle': zero,
        'coverage': np.dstack((foil, zero, zero, laminate)),
        'surface': np.dstack((height, roughness, zero)),
    }.items():
        save(folder, name, field)

    # Review artifacts show registration, not a modified runtime print.
    review = ROOT / 'artifacts/signal-forest/maps'
    review.mkdir(parents=True, exist_ok=True)
    base = np.asarray(front.resize((MAP_W, MAP_H), Image.Resampling.LANCZOS)).astype(np.float32) / 255
    effective = foil * (1 - protection)
    alpha = (effective * .65)[..., None]
    overlay = base * (1 - alpha) + np.array([.05, 1, .38]) * alpha
    save(review, f'{id}-registration', overlay)
    preview = Image.new('RGB', (1200, 800), '#111818')
    for k, name in enumerate(['front', 'foil', 'protection', 'roughness', 'normal', 'height']):
        img = Image.open(folder / f'{name}.png').convert('RGB')
        img.thumbnail((194, 742))
        preview.paste(img, (k*200 + 3, 35))
        ImageDraw.Draw(preview).text((k*200+8, 10), name, fill='white')
    preview.save(review / f'{id}-fields.png')
    metadata = {
        'title': title, 'sourceFile': filename,
        'sourceSHA256': hashlib.sha256((folder / 'source.jpg').read_bytes()).hexdigest(),
        'originalSize': [w, h], 'canvasSize': [cw, ch],
        'artworkPixels': [pad, pad*2, w, h], 'mapSize': [MAP_W, MAP_H],
        'sourcePixelsPreserved': True, 'identicalFaces': True,
        'tracedLineComponents': lines, 'registeredDots': dot_count, 'treeContours': tree_lines,
        'relief': 'Designed constant-section die from source-feature polylines; depth/spacing are artistic choices, not measured physical relief.',
        'grating': 'Uniform sheet axis, independent of die paths; follows authored normals.',
        'disabled': ['procedural engraving', 'extra emboss', 'random sparkle', 'facet noise', 'image hologram'],
    }
    (folder / 'source.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(metadata))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, help='Initial import; later builds use the preserved source.jpg files.')
    args = parser.parse_args()
    for card in CARDS:
        build(card, args.source_dir)
