"""Register exact-card reference photographs to the untouched print front.

This prepares comparison images for manual line review. It does not infer
etching, classify foil, or generate any renderer maps from photograph pixels.
"""
from pathlib import Path
import argparse
import hashlib
import json
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
RESEARCH = ROOT / 'research/prismatic-evolutions'


def register(photo, front):
    # Match printed landmarks, then reject specular features using a robust
    # projective fit. Work at native source resolution; enlargement adds no data.
    detector = cv2.SIFT_create(nfeatures=10000, contrastThreshold=.02)
    photo_keys, photo_features = detector.detectAndCompute(cv2.cvtColor(photo, cv2.COLOR_BGR2GRAY), None)
    front_keys, front_features = detector.detectAndCompute(cv2.cvtColor(front, cv2.COLOR_BGR2GRAY), None)
    if photo_features is None or front_features is None:
        raise ValueError('Not enough printed landmarks')
    pairs = cv2.BFMatcher().knnMatch(photo_features, front_features, k=2)
    matches = [a for a, b in pairs if a.distance < .7 * b.distance]
    if len(matches) < 24:
        raise ValueError(f'Only {len(matches)} unambiguous landmark matches')
    source = np.float32([photo_keys[m.queryIdx].pt for m in matches])
    target = np.float32([front_keys[m.trainIdx].pt for m in matches])
    matrix, accepted = cv2.findHomography(source, target, cv2.RANSAC, 2.0, maxIters=10000, confidence=.999)
    if matrix is None or accepted is None:
        raise ValueError('Projective registration failed')
    keep = accepted[:, 0].astype(bool)
    if keep.sum() < 24:
        raise ValueError(f'Only {keep.sum()} consistent printed landmarks')
    source, target = source[keep], target[keep]
    projected = cv2.perspectiveTransform(source[None], matrix)[0]
    errors = np.linalg.norm(projected - target, axis=1)
    width, height = front.shape[1], front.shape[0]
    quadrants = [int((((target[:, 0] >= width/2) == right) & ((target[:, 1] >= height/2) == bottom)).sum())
                 for bottom in (False, True) for right in (False, True)]
    if min(quadrants) < 3 or np.percentile(errors, 95) > 2:
        raise ValueError('Printed landmarks do not adequately cover all four quarters')
    # Save a 2x display image to preserve source detail for close inspection.
    # Registration metrics remain in the 600x825 print-master coordinate space.
    output_matrix = np.diag([2., 2., 1.]) @ matrix
    aligned = cv2.warpPerspective(photo, output_matrix, (width*2, height*2), flags=cv2.INTER_CUBIC)
    return aligned, {
        'sourceToPrintMaster': matrix.tolist(),
        'inlierCount': int(keep.sum()), 'inliersByQuarter': quadrants,
        'medianErrorPrintPixels': round(float(np.median(errors)), 4),
        'p95ErrorPrintPixels': round(float(np.percentile(errors, 95)), 4),
        'landmarks': [{'photo': p.tolist(), 'print': q.tolist()} for p, q in zip(source, target)],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('number', choices=[f'{n:03}' for n in range(1, 181)])
    parser.add_argument('--variant', default='holo', choices=['holo', 'pokeball-reverse', 'masterball-reverse'])
    args = parser.parse_args()
    identity = f'sv08.5-{args.number}'
    references = json.loads((RESEARCH / 'references.json').read_text(encoding='utf-8'))
    source_front = ROOT / f'public/cards/pokemon/prismatic-evolutions/{args.number}.png'
    front = cv2.imread(str(source_front))
    output = RESEARCH / 'registered' / f'{args.number}-{args.variant}'
    output.mkdir(parents=True, exist_ok=True)
    manifest = {'cardId': identity, 'variant': args.variant, 'coordinates': [600, 825],
                'displaySize': [1200, 1650], 'frontSha256': hashlib.sha256(source_front.read_bytes()).hexdigest(),
                'purpose': 'Reference comparison only. These photographs are never foil, height or normal maps.',
                'limitations': 'A planar registration aligns printed landmarks, not individual etched ridges. Lens distortion, trimming, specimen variation and residual alignment error require visual review before tracing.',
                'photos': [], 'rejected': []}
    for reference in references['photos']:
        if (reference['cardId'], reference['variant'], reference['assessment']) != (identity, args.variant, 'partial-surface'):
            continue
        filename = reference['file']
        photo_path = RESEARCH / 'photos' / filename
        try:
            aligned, metrics = register(cv2.imread(str(photo_path)), front)
        except ValueError as error:
            manifest['rejected'].append({'file': filename, 'reason': str(error)})
            print(f'{filename}: rejected: {error}')
            continue
        destination = output / f'{photo_path.stem}.webp'
        if not cv2.imwrite(str(destination), aligned, [cv2.IMWRITE_WEBP_QUALITY, 101]):
            raise OSError(f'Cannot write {destination}')
        manifest['photos'].append({'source': filename, 'file': destination.name,
            'sourceSha256': hashlib.sha256(photo_path.read_bytes()).hexdigest(),
            'registeredSha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
            'observed': reference['notes'], **metrics})
        print(f'{filename}: {metrics["inlierCount"]} landmarks, median {metrics["medianErrorPrintPixels"]:.2f} print pixels')
    (output / 'registration.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')


if __name__ == '__main__':
    main()
