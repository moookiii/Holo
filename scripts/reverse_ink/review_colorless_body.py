"""Signed boundary diagnostics for the authored body, not an accuracy certificate."""
import json
import numpy as np
import cv2
from PIL import Image
from normalize import DATA
from fit_symbol import sample_path
from build_colorless_body import authored_path
from build_pattern_drafts import transform_path


def main():
    spec = json.loads((DATA / 'references/colorless-body-contours.json').read_text())
    out = DATA / 'review/patterns/colorless-network-body'
    refinements = {}
    if (out / 'path-registration.json').exists():
        refinements = {r['opening']: r for r in json.loads((out / 'path-registration.json').read_text())['paths']}
    x0, y0, x1, y1 = spec['bounds']
    scale = 3
    images = {}
    for name in spec['sources']:
        raw = np.array(Image.open(out / f'{name}-source.png').convert('RGB'))
        lum = cv2.cvtColor(raw, cv2.COLOR_RGB2GRAY).astype('float32') / 255
        images[name] = cv2.GaussianBlur(lum, (0, 0), scale * .6)
    measurements = []
    offsets = np.linspace(-5, 5, 41)
    for opening in spec['openings']:
        contour = authored_path(opening['d'])
        if opening['id'] in refinements:
            r = refinements[opening['id']]
            contour = transform_path(contour, np.array(r['matrix']), np.array(r['offset']))
        points = sample_path(contour, 30)
        tangent = np.roll(points, -1, axis=0) - np.roll(points, 1, axis=0)
        normals = np.c_[-tangent[:, 1], tangent[:, 0]]
        normals /= np.maximum(np.linalg.norm(normals, axis=1)[:, None], .001)
        keep = ((points[:, 0] > x0 + 7) & (points[:, 0] < x1 - 7)
                & (points[:, 1] > y0 + 7) & (points[:, 1] < y1 - 7))
        points, normals = points[keep], normals[keep]
        if len(points) == 0:
            continue
        candidates = points[:, None] + offsets[None, :, None] * normals[:, None]
        source_checks = []
        for name, field in images.items():
            def read(coords):
                coords = (coords - [x0, y0]) * scale
                return cv2.remap(field, coords[:, :, 0].astype('float32'),
                                 coords[:, :, 1].astype('float32'), cv2.INTER_LINEAR)
            gradient = read(candidates + normals[:, None] * 1.5) - read(candidates - normals[:, None] * 1.5)
            best = np.argmax(gradient, axis=1)
            peak = gradient[np.arange(len(points)), best]
            supported = peak > .025
            source_checks.append({'source': name,
                'median_signed_contrast_at_path': round(float(np.median(gradient[:, 20])), 4),
                'correct_polarity_fraction': round(float(np.mean(gradient[:, 20] > 0)), 4),
                'edge_support_fraction': round(float(np.mean(supported)), 4),
                'median_signed_peak_distance': round(float(np.median(abs(offsets[best[supported]]))), 3) if np.any(supported) else None,
                'p90_signed_peak_distance': round(float(np.percentile(abs(offsets[best[supported]]), 90)), 3) if np.any(supported) else None})
        measurements.append({'opening': opening['id'], 'evidence': opening['evidence'],
                             'sources': source_checks})
    report = {'status': 'diagnostic-not-approval',
              'method': 'Signed lighter-inside minus darker-outside differences at authored boundaries and a bounded +/-5-unit normal search.',
              'limitations': ['Foreground is deliberately retained in the source photographs; it can corrupt any source score.',
                             'Distance is to a selected signed contrast peak, not known ground truth.',
                             'Low support cannot prove a boundary; inspect the three source overlays.',
                             'No contours are automatically moved or approved by this script.'],
              'measurements': measurements}
    (out / 'signed-boundaries.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    for entry in measurements:
        if 'interpolated' in entry['evidence']:
            continue
        best = max(entry['sources'], key=lambda r: r['correct_polarity_fraction'])
        print(entry['opening'], best['source'], best['correct_polarity_fraction'], best['median_signed_peak_distance'])


if __name__ == '__main__':
    main()
