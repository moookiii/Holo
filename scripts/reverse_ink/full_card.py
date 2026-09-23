"""Compile editable source-authored outlines into finite card-space ink SVGs.

This is offline Step 1 geometry. The SVG's internal mask is a Boolean union /
subtraction of vector shapes, never a per-card foreground protection asset.
Unknown illustration regions are declared separately from the ink geometry.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image
from normalize import ROOT, DATA
from fit_symbol import svg_path, polygon_path
from build_colorless_body import authored_path
from build_pattern_drafts import transform_path
from reconstruct_wheel import polar, svg_geometry

ASSETS = ROOT / 'assets/reverse-ink/sv'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def path_data(item):
    if 'd' in item:
        return item['d']
    points = np.array(item['points'], dtype=float)
    radius = item.get('rounding', 0)
    if not radius:
        return 'M ' + ' L '.join(f'{x:g} {y:g}' for x, y in points) + ' Z'
    # Short circular-style quadratic corners, bounded by the two adjacent edges.
    # No resampled photo contour or high-frequency control points are introduced.
    incoming, outgoing = [], []
    for i, point in enumerate(points):
        previous, following = points[i-1], points[(i+1) % len(points)]
        a, b = previous-point, following-point
        r = min(radius, np.linalg.norm(a)*.22, np.linalg.norm(b)*.22)
        incoming.append(point + a / max(np.linalg.norm(a), 1e-9) * r)
        outgoing.append(point + b / max(np.linalg.norm(b), 1e-9) * r)
    fmt = lambda p: f'{p[0]:.3f} {p[1]:.3f}'
    d = 'M ' + fmt(outgoing[-1])
    for p, a, b in zip(points, incoming, outgoing):
        d += f' L {fmt(a)} Q {fmt(p)} {fmt(b)}'
    return d + ' Z'


def centered_glyph(family, records):
    spec = read(DATA / f'review/symbols/{family}.json')
    source = records[spec['spec']['source']]
    scale = 105 / source['inner_ring_radius']
    origin = (np.array(spec['spec']['patch'][:2])-source['center']) * scale
    return [transform_path(p, np.eye(2)*scale, origin) for p in spec['refined_paths']]


def glyph_d(paths, center, scale, rotation):
    a = np.deg2rad(rotation)
    m = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]]) * scale
    # One compound path is essential: separate filled subpaths would erase holes.
    return ' '.join(svg_path(transform_path(p, m, center)) for p in paths)


def compile_family(family):
    selection = next(f for f in read(DATA/'references/selected-sources.json')['families'] if f['family']==family)
    spec_path = DATA / f'references/full-card/{family}.json'
    spec = read(spec_path)
    if spec['source'] != selection['source'] or spec['family'] != family:
        raise ValueError('The authored geometry must name the selected own-family source')
    records = {r['id']: r for r in read(DATA/'review/radial/measurements.json')}
    source = records[spec['source']]
    glyphs = centered_glyph(family, records)
    if 'glyph_paths' in spec:
        glyphs = [authored_path(d) for d in spec['glyph_paths']]
    rejected = family in ('grass', 'fire') and 'glyph_paths' not in spec
    if rejected:
        raise ValueError(f'{family}: rejected glyph cannot be promoted')
    ratio = source['inner_ring_radius']/105
    cx, cy = source['center']
    # Body contours use the measured wheel frame; perimeter contours use the
    # actual normalized full-card frame. No additional photo resampling is used.
    body_transform = f'translate({cx:.5f} {cy:.5f}) scale({ratio:.7f}) translate(-448 -598)'
    body = []
    for item in spec['body_openings']:
        body.append((path_data(item), item.get('evidence', 'observed'), item['id']))
    model = read(DATA/'review/radial/wheel-model.json')['model']
    wheel = ''.join(f'<path d="{d}"/>' for d in svg_geometry(model))
    wheel = f'<g transform="translate(448 598)">{wheel}</g>'
    wheel += f'<path d="{glyph_d(glyphs, [448,598], 1, 0)}"/>'
    surrounding = [(glyph_d(glyphs, g['center'], g['scale'], g['rotation']), g.get('evidence','observed'), g['id']) for g in spec['body_glyphs']]
    sector = read(DATA/'review/patterns/sector-placement.json')
    small = []
    for i in range(10):
        center = np.array([448,598])+polar(sector['radius'],18+36*i+sector['phase_degrees'])
        small.append(glyph_d(glyphs, center, sector['scale'], sector['rotation_base_degrees']+36*i))
    perimeter = [(path_data(p), p.get('evidence','observed'), p['id']) for p in spec['perimeter_openings']]
    perimeter += [(glyph_d(glyphs, g['center'], g['scale'], g['rotation']), g.get('evidence','observed'), g['id']) for g in spec['perimeter_glyphs']]
    bounds = spec['visible_envelope']
    regions = ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>' for x,y,w,h in bounds)
    description = ('Printed network only. Full card frame; observed perimeter and body with explicitly '
                   'documented text interpolation. Blank unknown regions are not proof of absent ink. '
                   f'One selected reference: {spec["source"]}. First-pass reconstruction; see companion JSON.')
    prefix = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 880">',
              f'<title>{family.title()} printed reverse ink — full-card first pass</title>',
              f'<desc>{description}</desc>']
    parts = prefix + [f'<defs><clipPath id="{family}-observed">{regions}</clipPath>',
             f'<mask id="{family}-network" maskUnits="userSpaceOnUse" x="0" y="0" width="630" height="880">',
             '<rect width="630" height="880" fill="white"/>', '<g fill="black" fill-rule="evenodd">']
    # The two coordinate spaces must not overwrite each other at y=445/741.
    parts.append(f'<g transform="{body_transform}">')
    parts.extend(f'<path d="{d}"/>' for d,_,_ in body+surrounding)
    parts.append(wheel)
    parts.append('<g fill="white">'+''.join(f'<path d="{d}"/>' for d in small)+'</g></g>')
    parts.extend(f'<path d="{d}"/>' for d,_,_ in perimeter)
    parts += ['</g></mask></defs>', f'<g clip-path="url(#{family}-observed)"><rect width="630" height="880" fill="currentColor" mask="url(#{family}-network)"/></g>', '</svg>']
    outlines = prefix + [f'<defs><clipPath id="bounds">{regions}</clipPath></defs>', '<g clip-path="url(#bounds)" fill="none" stroke-width=".65" stroke="#ff2b68" fill-rule="evenodd">']
    def outlined(collection):
        return ''.join(f'<path d="{d}"'+(' stroke="#a96700" stroke-dasharray="2 1.5"' if 'interpolat' in e else '')+'/>' for d,e,_ in collection)
    outlines += [f'<g transform="{body_transform}">', outlined(body+surrounding), wheel,
                 ''.join(f'<path d="{d}"/>' for d in small), '</g>', outlined(perimeter), '</g></svg>']
    out = DATA / f'review/full-card/{family}'
    out.mkdir(parents=True, exist_ok=True)
    (ASSETS/'drafts/full-card').mkdir(parents=True,exist_ok=True)
    (ASSETS/f'drafts/full-card/{family}.svg').write_text('\n'.join(parts)+'\n',encoding='utf-8',newline='\n')
    (out/'boundaries.svg').write_text('\n'.join(outlines)+'\n',encoding='utf-8',newline='\n')
    # Lossless downsampled review; normalization's full resolution remains available.
    with Image.open(DATA/f'normalized/{spec["source"]}.png') as original:
        original.resize((945,1320),Image.Resampling.LANCZOS).save(out/'reference.png')
    report = dict(family=family, source=spec['source'], status='full-card-first-pass-needs-review',
                  geometry_sha256=hashlib.sha256(spec_path.read_bytes()).hexdigest(),
                  coordinate_system=[630,880], observed_envelope=bounds, unknown_regions=spec['unknown_regions'],
                  body_opening_count=len(body), perimeter_opening_count=len(perimeter),
                  interpolation=[ident for _,e,ident in body+surrounding+perimeter if 'interpolat' in e],
                  limitations=spec['notes'], photo_resampling='Review downsample only; geometry uses full-card normalized source coordinates.')
    (out/'review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('family', nargs='?', default='all')
    args=parser.parse_args()
    families=[r['family'] for r in read(DATA/'references/selected-sources.json')['families']] if args.family=='all' else [args.family]
    for family in families:
        report=compile_family(family)
        print(f'{family}: {report["body_opening_count"]} body + {report["perimeter_opening_count"]} perimeter contours')
