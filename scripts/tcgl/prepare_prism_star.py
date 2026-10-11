"""Add the omitted outer-border coverage, retaining every TCGL interior texel.

Seed-connected color matching traces the flat outer ink in each clean front,
including card-specific tabs/corners. This is not artwork-brightness segmentation
or relief generation. Full-card PNG output; untouched exact foil is reused.
"""
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    audit = json.loads((ROOT / 'docs/references/prism-star/tcgl-audit.json').read_text())
    for card in audit['cards']:
        cid = card['cardId']
        source = ROOT / card['assets']['front']['path']
        assert digest(source) == card['assets']['front']['sha256']
        rgb = np.asarray(Image.open(source).convert('RGB').crop((145, 0, 878, 1024))).astype(np.float32)
        h, w = rgb.shape[:2]
        border_color = np.median(rgb[:, :10], axis=(0, 1))
        distance = np.max(np.abs(rgb - border_color), axis=2)
        yy, xx = np.mgrid[:h, :w]
        perimeter = (xx < 36) | (xx >= w - 36) | (yy < 36) | (yy >= h - 36)
        candidate = ((distance <= 12) & perimeter).astype(np.uint8)
        _, labels = cv2.connectedComponents(candidate, connectivity=8)
        edge_labels = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
        connected = np.isin(labels, edge_labels[edge_labels != 0])
        border = np.rint(np.clip((12 - distance) / 8, 0, 1) * connected * 255).astype(np.uint8)
        original = ROOT / f'public/cards/pokemon/tcgl-sm/{cid}/protection.png'
        protection = np.asarray(Image.open(original).convert('L')).copy()
        assert protection.shape == border.shape
        protection = np.rint(protection * (1 - border / 255)).astype(np.uint8)
        dest = ROOT / f'public/cards/pokemon/prism-star/{cid}'
        dest.mkdir(parents=True, exist_ok=True)
        Image.fromarray(border).save(dest / 'border.png')
        Image.fromarray(protection).save(dest / 'protection.png')
        evidence = {
            'tcglCardId': cid, 'tcglVariantId': card['variantId'],
            'research': 'docs/prism-star-finish-research.md',
            'originalEvidence': f'public/cards/pokemon/tcgl-sm/{cid}/evidence.json',
            'sourceFront': card['assets']['front'],
            'originalProtectionSha256': digest(original),
            'registration': {'dimensions': [w, h], 'sourceCrop': [145, 0, 878, 1024], 'flip': False},
            'borderMethod': 'Edge-connected flat outer ink; max RGB distance 12, full coverage <=4, confined to outer 36 pixels; card-specific tabs excluded.',
            'borderRGB': border_color.tolist(),
            'composition': 'Existing exact TCGL foil unchanged. Extended border uses SAME primary optical field. Protection multiplied by 1-border only.',
            'etch': 'Exact TCGL entry has no etch. No normal or height generated.',
            'outputs': {name: digest(dest / name) for name in ['border.png', 'protection.png']},
        }
        (dest / 'evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print('Prepared 27 exact-print border/protection pairs; original assets unchanged.')

if __name__ == '__main__':
    main()
