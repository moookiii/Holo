"""Crop exact source pixels to an opaque rectangle with no tapered side gaps."""
from pathlib import Path
import hashlib
import json
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def opaque_rectangle(mask):
    """Largest rectangle wholly inside the measured wrapper silhouette."""
    heights = np.zeros(mask.shape[1], dtype=int)
    best_area, best = 0, None
    for y, row in enumerate(mask):
        heights = np.where(row, heights + 1, 0)
        stack = []
        for x in range(len(heights) + 1):
            value = heights[x] if x < len(heights) else 0
            start = x
            while stack and stack[-1][1] > value:
                left, height = stack.pop()
                area = int(height * (x - left))
                start = left
                if area > best_area:
                    best_area = area
                    best = (int(left), int(y - height + 1), int(x), y + 1)
            if not stack or stack[-1][1] < value:
                stack.append((start, value))
    assert best is not None
    return best


def prepare_wrappers():
    product = json.loads((ROOT/'research/aquapolis/wrapper-product.json').read_text())
    wrappers = []
    for i, design in enumerate(['tyranitar', 'entei', 'arcanine', 'scizor']):
        source = ROOT/f'research/aquapolis/wrapper-{i}.png'
        pixels = np.array(Image.open(source).convert('RGB'))
        candidate = (pixels.max(axis=2) > 25).astype('uint8')
        _, labels, stats, _ = cv2.connectedComponentsWithStats(candidate)
        component = (labels == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])).astype('uint8')
        contours, _ = cv2.findContours(component, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        silhouette = np.zeros_like(component)
        cv2.drawContours(silhouette, contours, -1, 255, cv2.FILLED)
        crop = opaque_rectangle(silhouette == 255)
        left, top, right, bottom = crop
        rgba = np.dstack([pixels[top:bottom, left:right],
                          np.full((bottom-top, right-left), 255, dtype=np.uint8)])
        target = ROOT/f'public/packs/pokemon/ecard2-{design}.png'
        Image.fromarray(rgba).save(target)
        assert np.array_equal(np.array(Image.open(target))[:, :, :3], pixels[top:bottom, left:right])
        wrappers.append({
            'design': design, 'url': 'https:' + product['images'][i],
            'sourcePage': 'https://loosepacks.com/products/aquapolis-unlimited-short-crimp',
            'sourceSha256': sha(source), 'sha256': sha(target),
            'crop': list(crop), 'dimensions': [right-left, bottom-top],
            'method': 'Largest fully opaque rectangular crop inside the wrapper silhouette; tapered empty side gaps and outer edge padding trimmed; printed artwork and both seal bands retained; exact source pixels, no rotation, stretching or resampling.'
        })
        print(design, list(crop), [right-left, bottom-top])
    (ROOT/'scripts/aquapolis/wrapper-sources.json').write_text(json.dumps(wrappers, indent=2)+'\n')


if __name__ == '__main__':
    prepare_wrappers()
