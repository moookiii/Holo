"""Register sparse authored openings to signed edges without adding path vertices.

Only a translation, axis scale and rotation can change each path. Uncertain
text-interpolated paths are excluded. Output is a candidate, not auto-approval.
"""
import json
import numpy as np
import cv2
from scipy.optimize import least_squares
from normalize import DATA
from fit_symbol import sample_path
from build_colorless_body import authored_path
from PIL import Image


def matrix(values):
    dx, dy, sx, sy, angle = values
    a = np.deg2rad(angle)
    return np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]]) @ np.diag([sx, sy]), np.array([dx, dy])


def main():
    spec = json.loads((DATA / 'references/colorless-body-contours.json').read_text())
    out = DATA / 'review/patterns/colorless-network-body'
    x0, y0, x1, y1 = spec['bounds']
    raw = np.array(Image.open(out / 'lickitung-source.png').convert('RGB'))
    field = cv2.cvtColor(raw, cv2.COLOR_RGB2GRAY).astype('float32') / 255
    field = cv2.GaussianBlur(field, (0, 0), 2.5)
    rows = []
    for opening in spec['openings']:
        if opening['evidence'] != 'observed':
            continue
        points = sample_path(authored_path(opening['d']), 30)
        center = np.mean(points, axis=0)
        initial = np.array([0, 0, 1, 1, 0], dtype=float)
        values = initial.copy()
        for iteration in range(4):
            m, t = matrix(values)
            current = (points-center) @ m.T + center + t
            tangent = np.roll(current, -1, axis=0)-np.roll(current, 1, axis=0)
            normal = np.c_[-tangent[:, 1], tangent[:, 0]]
            normal /= np.maximum(np.linalg.norm(normal, axis=1)[:, None], .001)
            offsets = np.linspace(-10, 10, 81)
            candidates = current[:, None] + offsets[None, :, None] * normal[:, None]
            def read(coords):
                coords = (coords - [x0, y0]) * 3
                return cv2.remap(field, coords[:, :, 0].astype('float32'),
                    coords[:, :, 1].astype('float32'), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            gradient = read(candidates + normal[:, None] * 1.5)-read(candidates-normal[:, None] * 1.5)
            # Positive light-inside/dark-outside contrast is essential. Absolute
            # gradients would let the optimizer jump across the dark ink band.
            best = np.argmax(gradient - .00035 * offsets[None] ** 2, axis=1)
            strength = gradient[np.arange(len(points)), best]
            keep = ((current[:, 0] > x0+12) & (current[:, 0] < x1-12)
                    & (current[:, 1] > y0+12) & (current[:, 1] < y1-12)
                    & (strength > .035))
            if np.sum(keep) < 12:
                break
            target = candidates[np.arange(len(points)), best]
            weight = np.clip(strength/.10, .0, 1)
            def residual(v):
                candidate_m, candidate_t = matrix(v)
                moved = (points-center) @ candidate_m.T + center + candidate_t
                distance = np.sum((moved-target)*normal, axis=1)
                regularizer = (v-initial) * [1.5, 1.5, 55, 55, 1]
                return np.r_[distance[keep] * weight[keep], regularizer]
            fit = least_squares(residual, values, bounds=([-10,-10,.8,.8,-10],[10,10,1.2,1.2,10]),
                                loss='soft_l1', f_scale=1.5, max_nfev=200)
            values = fit.x
        m, t = matrix(values)
        rows.append({'opening': opening['id'], 'status': 'bounded-signed-registration-candidate',
                     'source': 'lickitung', 'values': values.tolist(), 'center': center.tolist(),
                     'matrix': m.tolist(), 'offset': (center+t-m@center).tolist(),
                     'warning': 'A sparse path registration can still be wrong. Inspect secondary-source overlays; no vertices or control points were added.'})
        print(opening['id'], np.round(values, 2).tolist())
    (out / 'path-registration.json').write_text(json.dumps({'status':'review-required', 'paths':rows},indent=2)+'\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
