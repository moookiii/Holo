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


def print_bounds(bounds, width, height):
    """A close-up must explicitly declare its photographed print rectangle."""
    if bounds is None:
        return [0, 0, width, height]
    if (len(bounds) != 4 or not np.isfinite(bounds).all()
            or not 0 <= bounds[0] < bounds[2] <= width
            or not 0 <= bounds[1] < bounds[3] <= height):
        raise ValueError('Invalid photographed print bounds')
    return list(bounds)


def landmark_coverage(target, errors, bounds):
    x0, y0, x1, y1 = bounds
    if (len(target) < 24 or not np.isfinite(errors).all()
            or np.any(target < [x0, y0]) or np.any(target > [x1, y1])):
        raise ValueError('Insufficient landmarks inside photographed bounds')
    quadrants = [int((((target[:, 0] >= (x0+x1)/2) == right)
                     & ((target[:, 1] >= (y0+y1)/2) == bottom)).sum())
                 for bottom in (False, True) for right in (False, True)]
    if min(quadrants) < 3 or np.percentile(errors, 95) > 2:
        raise ValueError('Printed landmarks do not adequately cover all four quarters of the photographed area')
    return quadrants


def register(photo, front, bounds=None):
    width, height = front.shape[1], front.shape[0]
    close_up = bounds is not None
    bounds = print_bounds(bounds, width, height)
    # Match printed landmarks, then reject specular features using a robust
    # projective fit. Work at native source resolution; enlargement adds no data.
    detector = cv2.SIFT_create(nfeatures=10000, contrastThreshold=.02)
    photo_keys, photo_features = detector.detectAndCompute(cv2.cvtColor(photo, cv2.COLOR_BGR2GRAY), None)
    front_keys, front_features = detector.detectAndCompute(cv2.cvtColor(front, cv2.COLOR_BGR2GRAY), None)
    if photo_features is None or front_features is None:
        raise ValueError('Not enough printed landmarks')
    pairs = cv2.BFMatcher().knnMatch(photo_features, front_features, k=2)
    matches = [a for a, b in pairs if a.distance < .7 * b.distance]
    x0, y0, x1, y1 = bounds
    matches = [m for m in matches
               if x0 <= front_keys[m.trainIdx].pt[0] <= x1
               and y0 <= front_keys[m.trainIdx].pt[1] <= y1]
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
    quadrants = landmark_coverage(target, errors, bounds)
    # Never project an unseen part of a close-up into the print coordinate grid.
    if close_up:
        corners = np.float32([[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]])
        source_corners = cv2.perspectiveTransform(corners, np.linalg.inv(matrix))[0]
        if (np.any(source_corners < 2)
                or np.any(source_corners > [photo.shape[1]-3, photo.shape[0]-3])):
            raise ValueError('Photographed bounds extend beyond the source image')
    # Save a 2x display image to preserve source detail for close inspection.
    # Registration metrics remain in the 600x825 print-master coordinate space.
    output_matrix = np.diag([2., 2., 1.]) @ matrix
    aligned = cv2.warpPerspective(photo, output_matrix, (width*2, height*2), flags=cv2.INTER_CUBIC)
    if close_up:
        alpha = np.zeros((height*2, width*2), dtype=np.uint8)
        alpha[int(np.ceil(y0*2)):int(np.floor(y1*2)), int(np.ceil(x0*2)):int(np.floor(x1*2))] = 255
        aligned[alpha == 0] = 0
        aligned = np.dstack([aligned, alpha])
    return aligned, {
        **({'printBounds': bounds, 'closeUp': True} if close_up else {}),
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
            aligned, metrics = register(cv2.imread(str(photo_path)), front, reference.get('registrationBounds'))
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
