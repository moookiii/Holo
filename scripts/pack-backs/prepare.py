"""Reproduce reviewed pack-back PNGs without upscaling or changing their print."""
from pathlib import Path
import hashlib
import json
import requests
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
CONFIG = Path(__file__).with_name('sources.json')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    evidence = []
    raw = ROOT / 'research/pack-backs'
    raw.mkdir(parents=True, exist_ok=True)
    for source in json.loads(CONFIG.read_text()):
        sid = source['setId']
        original = raw / (sid + '.jpg')
        if not original.exists():
            response = requests.get(source['url'], timeout=45)
            response.raise_for_status()
            original.write_bytes(response.content)
        im = Image.open(original).convert('RGB')
        quad = source.get('quad')
        if quad:
            points = np.array(quad, dtype=np.float32)
            # Use the shorter opposing edges: rectification never enlarges the
            # measured photograph to manufacture resolution.
            width = int(min(np.linalg.norm(points[1] - points[0]), np.linalg.norm(points[2] - points[3])))
            height = int(min(np.linalg.norm(points[3] - points[0]), np.linalg.norm(points[2] - points[1])))
            target = np.array([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], dtype=np.float32)
            transform = cv2.getPerspectiveTransform(points, target)
            pixels = cv2.warpPerspective(np.array(im), transform, (width, height), flags=cv2.INTER_LINEAR)
            result = Image.fromarray(pixels)
            if source.get('outline'):
                mask = Image.new('L', (im.width * 2, im.height * 2))
                ImageDraw.Draw(mask).polygon([(x * 2, y * 2) for x, y in source['outline']], fill=255)
                mask = mask.resize(im.size, Image.Resampling.LANCZOS)
                alpha = cv2.warpPerspective(np.array(mask), transform, (width, height), flags=cv2.INTER_LINEAR)
                result.putalpha(Image.fromarray(alpha))
        else:
            result = im.crop(source['crop'])
        rotation = source.get('rotation', 0)
        if rotation:
            result = result.transpose({90: Image.Transpose.ROTATE_90,
                180: Image.Transpose.ROTATE_180, 270: Image.Transpose.ROTATE_270}[rotation])
        out = ROOT / f'public/packs/pokemon/{sid}-back.png'
        result.save(out, optimize=True)
        evidence.append({**source, 'source': original.relative_to(ROOT).as_posix(),
            'sourceDimensions': list(im.size), 'sourceSha256': sha(original),
            'output': out.relative_to(ROOT).as_posix(), 'dimensions': list(result.size),
            'sha256': sha(out), 'rotation': rotation, 'resampled': bool(quad),
            'processing': 'Measured wrapper quadrilateral, bilinear perspective rectification, optional antialiased PNG alpha cutout, then lossless quarter-turn.' if quad else 'Native crop and lossless quarter-turn; no resizing.'})
    (ROOT / 'public/packs/pokemon/back-sources.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(f'{len(evidence)} set-specific pack backs prepared')

if __name__ == '__main__':
    main()
