"""GX effect glyph protection, in the clean front's 600 x 825 coordinates."""
from pathlib import Path
import hashlib
import json
import cv2
import numpy as np
from PIL import Image


def protect_gx_text(front, protection, scale=3):
    # Include the complete ascenders, accents and descenders of both lines.
    for a, b, c, d in [(29, 640, 573, 667), (29, 666, 302, 690)]:
        ys, xs = slice(b * scale, d * scale), slice(a * scale, c * scale)
        rgb = front[ys, xs]
        red, green, blue = rgb.transpose(2, 0, 1)
        ink = (blue > red + .15) & (blue > green + .05) & (blue > .32) & (red < .55) & (green < .50)
        keyline = (rgb.min(2) > .60) & (rgb.max(2) - rgb.min(2) < .30)
        # The printed white keyline extends farther than the old 1px search.
        # Only accept white next to blue ink; pale card artwork is not a glyph.
        near = cv2.dilate(ink.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))) > 0
        glyph = np.uint8(ink | (keyline & near)) * 255
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        glyph = cv2.morphologyEx(glyph, cv2.MORPH_CLOSE, kernel)
        glyph = cv2.dilate(glyph, kernel)
        # Remove scan-sized pinholes, retaining the larger open letter counters.
        count, labels, stats, _ = cv2.connectedComponentsWithStats(255 - glyph)
        for label in range(1, count):
            if stats[label, cv2.CC_STAT_AREA] <= 12:
                glyph[labels == label] = 255
        protection[ys, xs] = cv2.GaussianBlur(glyph, (0, 0), .55) / 255
    return protection


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    out = root / 'public/cards/umbreon-gx-sm1-154'
    mask = np.asarray(Image.open(out / 'protection.png').convert('L'), np.float32) / 255
    front = np.asarray(Image.open(out / 'front.png').convert('RGB').resize((1800, 2475)), np.float32) / 255
    result = protect_gx_text(front, mask.copy())
    Image.fromarray(np.uint8(np.clip(result, 0, 1) * 255)).save(out / 'protection.png')
    manifest = json.loads((out / 'source.json').read_text())
    manifest['maps']['protection.png'] = hashlib.sha256((out / 'protection.png').read_bytes()).hexdigest()
    (out / 'source.json').write_text(json.dumps(manifest, indent=2) + '\n')
    review = root / 'artifacts/umbreon-gx-sm1-154'
    overlay = front * (1 - result[..., None] * .48) + np.array([70, 80, 255]) / 255 * result[..., None] * .48
    Image.fromarray(np.uint8(overlay * 255)).crop((60, 1905, 1740, 2085)).save(review / 'gx-text-protection-overlay.png')
