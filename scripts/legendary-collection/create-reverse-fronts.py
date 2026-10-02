"""Composite exact LC non-holo scan windows into the existing LC fronts.

Requires Pillow, numpy, OpenCV and requests. No generative restoration,
inpainting, denoising, sharpening, or synthetic artwork is used.
Run from the repository root; downloaded references and QA stay in artifacts/.
"""
from pathlib import Path
import hashlib
import json

import cv2
import numpy as np
import requests
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SPEC = Path(__file__).with_name('reverse-front-sources.json')
CACHE = ROOT / 'artifacts/lc-clean'
FRONTS = ROOT / 'public/cards/pokemon/legendary-collection'
MASKS = Path(__file__).with_name('reverse-front-masks')
cv2.setNumThreads(2)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    MASKS.mkdir(exist_ok=True)
    report = []
    for row in json.loads(SPEC.read_text()):
        n = row['number']
        reference = CACHE / row['referenceFile']
        if not reference.exists():
            response = requests.get(row['url'], timeout=60)
            response.raise_for_status()
            reference.write_bytes(response.content)
        assert sha(reference) == row['sourceSha256'], f'{n}: reference changed'
        base = FRONTS / f'{n}.png'
        assert sha(base) == row['baseSha256'], f'{n}: base front changed'
        original = np.array(Image.open(base).convert('RGB'))
        source = np.array(Image.open(reference).convert('RGB'))
        target_quad = np.float32(row['targetQuad'])
        transform = cv2.getPerspectiveTransform(np.float32(row['sourceQuad']), target_quad)
        registered = cv2.warpPerspective(source, transform, (600, 825), flags=cv2.INTER_LANCZOS4)

        # Coverage follows the inner printed frame and excludes the original
        # evolution medallion. Raster coverage is the only compositing mask.
        coverage = Image.new('L', (2400, 3300))
        draw = ImageDraw.Draw(coverage)
        draw.polygon([tuple(float(v) * 4 for v in xy) for xy in target_quad], fill=255)
        if row['badgeLowerEdge']:
            polygon = [[0, 0], [200, 0], [200, 80]] + list(reversed(row['badgeLowerEdge'])) + [[0, 155]]
            draw.polygon([tuple(v * 4 for v in xy) for xy in polygon], fill=0)
        coverage = coverage.resize((600, 825), Image.Resampling.BOX)
        coverage.save(MASKS / f'{n}.png')
        mask = np.array(coverage)
        alpha = mask[:, :, None] / 255.0
        result = np.rint(registered * alpha + original * (1 - alpha)).astype(np.uint8)
        assert np.array_equal(result[mask == 0], original[mask == 0]), f'{n}: print changed'
        output = FRONTS / row['output']
        Image.fromarray(result).save(output)
        # Review: clean original, exact source window after registration, final.
        review = Image.new('RGB', (1800, 825))
        for x, pixels in enumerate([original, registered, result]):
            review.paste(Image.fromarray(pixels), (600 * x, 0))
        review.save(CACHE / f'{n}-comparison.png')
        overlay = original.copy()
        overlay[mask > 0] = (overlay[mask > 0] * .6 + np.array([0, 255, 160]) * .4).astype(np.uint8)
        Image.fromarray(overlay).save(CACHE / f'{n}-boundary.png')
        report.append({'number': n, 'output': row['output'], 'sha256': sha(output),
                       'changedPixels': int(np.count_nonzero(np.any(result != original, axis=2))),
                       'outsideMaskChangedPixels': 0})
        print(f'{n}: {row["sourceType"]}; surrounding print unchanged', flush=True)
    (CACHE / 'validation.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
