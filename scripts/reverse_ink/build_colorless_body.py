"""Assemble the source-authored Colorless body as a positive dark-ink field.

The SVG mask is internal vector boolean construction, not a card-foreground or
runtime protection mask. Source photo windows are diagnostic evidence only.
"""
import json
import re
import cv2
import numpy as np
from PIL import Image
from normalize import ROOT, DATA
from fit_symbol import svg_path
from reconstruct_wheel import svg_geometry
from build_pattern_drafts import transform_path


def authored_path(d):
    """Convert the deliberately limited authored M/L/C/Z syntax to cubic data."""
    tokens = re.findall(r'[MLCZ]|-?\d+(?:\.\d+)?', d)
    cursor = 0
    start = current = None
    curves = []
    while cursor < len(tokens):
        command = tokens[cursor]
        cursor += 1
        if command == 'M':
            current = start = np.array(list(map(float, tokens[cursor:cursor + 2])))
            cursor += 2
        elif command == 'L':
            end = np.array(list(map(float, tokens[cursor:cursor + 2])))
            cursor += 2
            curves.append([(current + (end - current) / 3).tolist(),
                           (current + 2 * (end - current) / 3).tolist(), end.tolist()])
            current = end
        elif command == 'C':
            curve = np.array(list(map(float, tokens[cursor:cursor + 6]))).reshape(3, 2)
            curves.append(curve.tolist())
            current = curve[-1]
            cursor += 6
        elif command == 'Z':
            if np.linalg.norm(current - start) > .001:
                curves.append([(current + (start - current) / 3).tolist(),
                               (current + 2 * (start - current) / 3).tolist(), start.tolist()])
        else:
            raise ValueError(f'Unsupported path token: {command}')
    return {'start': start.tolist(), 'curves': curves}


def main():
    spec = json.loads((DATA / 'references/colorless-body-contours.json').read_text())
    model = json.loads((DATA / 'review/radial/wheel-model.json').read_text())['model']
    placement = json.loads((DATA / 'review/patterns/sector-placement.json').read_text())
    rows = {r['id']: r for r in json.loads((DATA / 'review/radial/measurements.json').read_text())}
    symbol = json.loads((DATA / 'review/symbols/colorless.json').read_text())
    refinement_file = DATA / 'review/patterns/colorless-network-body/path-registration.json'
    refinements = {}
    if refinement_file.exists():
        refinements = {r['opening']: r for r in json.loads(refinement_file.read_text())['paths']}
    anchor = rows[symbol['spec']['source']]
    ratio = 105 / anchor['inner_ring_radius']
    x, y, *_ = symbol['spec']['patch']
    translation = np.array([448, 598]) + ratio * (np.array([x, y]) - anchor['center'])
    center_paths = [transform_path(p, np.eye(2) * ratio, translation) for p in symbol['refined_paths']]
    centered = [transform_path(p, np.eye(2), -np.array([448, 598])) for p in center_paths]
    from reconstruct_wheel import polar
    sector_paths = []
    for i in range(10):
        theta = np.deg2rad(placement['rotation_base_degrees'] + 36 * i)
        matrix = placement['scale'] * np.array([[np.cos(theta), -np.sin(theta)],
                                              [np.sin(theta), np.cos(theta)]])
        center = np.array([448, 598]) + polar(placement['radius'], 18 + 36 * i + placement['phase_degrees'])
        sector_paths.extend(transform_path(p, matrix, center) for p in centered)
    wheel = svg_geometry(model)
    x0, y0, x1, y1 = spec['bounds']
    view = f'{x0} {y0} {x1-x0} {y1-y0}'
    rect = f'x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}"'
    # The boolean mask unions overlapping light openings; it must not XOR them
    # back into ink where independently visible contour portions meet.
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}">',
             '<title>Colorless connected reverse-ink body: source-traced candidate</title>',
             '<desc>Dark connected bands with source-authored lighter openings, radial geometry and glyphs. Lower body only. Dashed diagnostic outlines identify text-interpolated candidates; see colorless-body-contours.json.</desc>',
             f'<defs><mask id="body-ink" maskUnits="userSpaceOnUse" {rect}>',
             f'<rect {rect} fill="white"/>', '<g fill="black">']
    outlines = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}">',
                '<g fill="none" stroke="#ed2166" stroke-width="0.55">']
    for opening in spec['openings']:
        contour = authored_path(opening['d'])
        if opening['id'] in refinements:
            r = refinements[opening['id']]
            contour = transform_path(contour, np.array(r['matrix']), np.array(r['offset']))
        d = svg_path(contour)
        parts.append(f'<path d="{d}"/>')
        dash = ' stroke="#a56804" stroke-dasharray="2 1.5"' if 'interpolated' in opening['evidence'] else ''
        outlines.append(f'<path{dash} d="{d}"/>')
    for collection in [parts, outlines]:
        collection.append('<g transform="translate(448 598)" fill-rule="evenodd">')
        collection.extend(f'<path d="{d}"/>' for d in wheel)
        collection.append('</g>')
        collection.extend(f'<path d="{svg_path(p)}"/>' for p in center_paths)
    parts.append('</g><g fill="white">')
    parts.extend(f'<path d="{svg_path(p)}"/>' for p in sector_paths)
    parts.append(f'</g></mask></defs><rect {rect} fill="currentColor" mask="url(#body-ink)"/></svg>')
    outlines.extend(f'<path d="{svg_path(p)}"/>' for p in sector_paths)
    outlines.append('</g></svg>')
    target = ROOT / 'assets/reverse-ink/sv/drafts/colorless-network-body.svg'
    target.write_text('\n'.join(parts) + '\n', encoding='utf-8', newline='\n')
    out = DATA / 'review/patterns/colorless-network-body'
    out.mkdir(exist_ok=True)
    (out / 'boundaries.svg').write_text('\n'.join(outlines) + '\n', encoding='utf-8', newline='\n')
    scale = 3
    yy, xx = np.mgrid[y0*scale:y1*scale, x0*scale:x1*scale].astype('float32')
    for name in spec['sources']:
        row = rows[name]
        r = row['inner_ring_radius'] / 105
        cx, cy = row['center']
        raw = np.array(Image.open(DATA / 'normalized' / f'{name}.png').convert('RGB'))
        photo = cv2.remap(raw, ((xx/scale-448)*r+cx)*2.4,
                         ((yy/scale-598)*r+cy)*2.4, cv2.INTER_LINEAR)
        Image.fromarray(photo).save(out / f'{name}-source.png')
    report = {'status': spec['status'], 'family': 'colorless', 'bounds': spec['bounds'],
              'opening_count': len(spec['openings']),
              'text_interpolated_openings': [p['id'] for p in spec['openings'] if 'interpolated' in p['evidence']],
              'sources': spec['sources'], 'limitations': spec['notes'],
              'bounded_registration_candidates': list(refinements),
              'validation': 'Inspect all three boundary overlays; counts and smooth paths alone do not validate contours.'}
    (out / 'review.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'Assembled Colorless lower body: {len(spec["openings"])} openings, wheel, 11 radial glyphs')


if __name__ == '__main__':
    main()
