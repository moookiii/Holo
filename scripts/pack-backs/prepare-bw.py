"""Prepare only reviewed BW wrapper reverses from preserved photographs."""
from pathlib import Path
import hashlib
import json
import cv2
import numpy as np
import requests
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    evidence = []
    for source in json.loads(Path(__file__).with_name('bw-sources.json').read_text()):
        original = ROOT / source['source']
        if not original.exists():
            original.parent.mkdir(parents=True, exist_ok=True)
            response = requests.get(source['url'], timeout=45)
            response.raise_for_status()
            original.write_bytes(response.content)
        if sha(original) != source['sourceSha256']:
            raise ValueError(f"Source changed: {original}")
        im = Image.open(original).convert('RGB')
        points = np.array(source['quad'], dtype=np.float32)
        width = int(min(np.linalg.norm(points[1] - points[0]), np.linalg.norm(points[2] - points[3])))
        height = int(min(np.linalg.norm(points[3] - points[0]), np.linalg.norm(points[2] - points[1])))
        target = np.array([[0, 0], [width-1, 0], [width-1, height-1], [0, height-1]], dtype=np.float32)
        transform = cv2.getPerspectiveTransform(points, target)
        pixels = cv2.warpPerspective(np.array(im), transform, (width, height), flags=cv2.INTER_LINEAR)
        result = Image.fromarray(pixels)
        # Polygon is traced in the original photograph's coordinates. The PNG
        # alpha removes only the external background; printing is untouched.
        mask = Image.new('L', (im.width * 4, im.height * 4))
        ImageDraw.Draw(mask).polygon([(x * 4, y * 4) for x, y in source['outline']], fill=255)
        mask = mask.resize(im.size, Image.Resampling.LANCZOS)
        alpha = cv2.warpPerspective(np.array(mask), transform, (width, height), flags=cv2.INTER_LINEAR)
        result.putalpha(Image.fromarray(alpha))
        output = ROOT / source['output']
        result.save(output, optimize=True)
        evidence.append({**source, 'sourceDimensions': list(im.size), 'dimensions': list(result.size),
                         'sha256': sha(output), 'rotation': source.get('rotation', 0), 'resampled': True,
                         'processing': 'Measured full-wrapper quadrilateral; bilinear perspective correction at shorter opposing-edge resolution; traced antialiased PNG alpha. No upscaling, sharpening, text reconstruction or color replacement.'})
        print(source['setId'], result.size)
    (ROOT / 'public/packs/pokemon/bw-back-sources.json').write_text(json.dumps(evidence, indent=2) + '\n')


if __name__ == '__main__':
    main()
