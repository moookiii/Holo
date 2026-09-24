"""Raster helpers for authored coverage contours; never physical relief."""
import re
import numpy as np


def contour(draw, path, value, scale=4):
    tokens = re.findall(r'[MLQCZ]|-?\d*\.?\d+', path)
    cursor, points, current = 0, [], np.zeros(2)
    while cursor < len(tokens):
        command = tokens[cursor]
        cursor += 1
        if command == 'Z':
            if len(points) < 3:
                raise ValueError('Coverage contour needs at least three points')
            draw.polygon([(round(x*scale), round(y*scale)) for x, y in points], fill=value)
            points = []
            continue
        count = {'M': 2, 'L': 2, 'Q': 4, 'C': 6}[command]
        controls = np.array([float(v) for v in tokens[cursor:cursor+count]]).reshape(-1, 2)
        cursor += count
        if command in ('M', 'L'):
            points.append(tuple(controls[0]))
        else:
            for t in np.linspace(0, 1, 64)[1:]:
                point = ((1-t)**2*current + 2*(1-t)*t*controls[0] + t*t*controls[1]) if command == 'Q' else ((1-t)**3*current + 3*(1-t)**2*t*controls[0] + 3*(1-t)*t*t*controls[1] + t**3*controls[2])
                points.append(tuple(point))
        current = controls[-1]
    if points:
        raise ValueError('Coverage contour must be explicitly closed')


def rectangle(draw, bounds, value, radius=0, scale=4):
    x0, y0, x1, y1 = bounds
    draw.rounded_rectangle((x0*scale, y0*scale, x1*scale-1, y1*scale-1), radius=radius*scale, fill=value)
