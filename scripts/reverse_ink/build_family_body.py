"""Build one independently authored family body; never fall back to Colorless.

The mask performs vector boolean subtraction only. It is not a card foreground
or runtime protection mask. Drafts remain drafts until their evidence is reviewed.
"""
import argparse
import hashlib
import json
import cv2
import numpy as np
from PIL import Image
from normalize import DATA, ROOT
from build_colorless_body import authored_path
from build_pattern_drafts import transform_path
from fit_symbol import svg_path
from reconstruct_wheel import polar, svg_geometry


def centered_symbol(family, rows):
    doc = json.loads((DATA / f'review/symbols/{family}.json').read_text())
    anchor = rows[doc['spec']['source']]
    assert anchor['family'] == family, 'Glyph must originate in its own family'
    scale = 105 / anchor['inner_ring_radius']
    offset = (np.array(doc['spec']['patch'][:2]) - anchor['center']) * scale
    return [transform_path(p, np.eye(2) * scale, offset) for p in doc['refined_paths']]


def placed_glyph(paths, occurrence):
    a = np.deg2rad(occurrence['rotation'])
    m = occurrence['scale'] * np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
    return [transform_path(p, m, occurrence['center']) for p in paths]


def build(family):
    file = DATA / f'references/{family}-body-contours.json'
    if not file.exists():
        raise ValueError(f'{family} has no independently authored body; no fallback is allowed')
    spec = json.loads(file.read_text(encoding='utf-8'))
    assert spec['family'] == family
    rows = {r['id']: r for r in json.loads((DATA / 'review/radial/measurements.json').read_text())}
    assert len(spec['sources']) >= 2
    assert all(rows[s]['family'] == family for s in spec['sources']), 'Mixed-family evidence is forbidden'
    if family != 'colorless':
        other = json.loads((DATA / 'references/colorless-body-contours.json').read_text())
        other_paths = {p['d'] for p in other['openings']}
        assert not other_paths.intersection(p['d'] for p in spec['openings']), 'Copied Colorless contours require explicit independent evidence'
    symbol = centered_symbol(family, rows)
    center_paths = [transform_path(p, np.eye(2), np.array([448, 598])) for p in symbol]
    fit_file = DATA / f'review/patterns/{family}-network-body/glyph-registration.json'
    registered = {}
    if fit_file.exists():
        registered = {r['id']: r for r in json.loads(fit_file.read_text())['glyphs']}
    glyph_paths = []
    for occurrence in spec.get('glyphs', []):
        pose = registered.get(occurrence['id'], occurrence)
        glyph_paths.append((occurrence, placed_glyph(symbol, pose)))
    model = json.loads((DATA / 'review/radial/wheel-model.json').read_text())['model']
    sector = json.loads((DATA / 'review/patterns/sector-placement.json').read_text())
    small = []
    for i in range(10):
        small.extend(placed_glyph(symbol, {
            'center': np.array([448, 598]) + polar(sector['radius'], 18 + 36*i + sector['phase_degrees']),
            'scale': sector['scale'], 'rotation': sector['rotation_base_degrees'] + 36*i}))
    x0,y0,x1,y1 = spec['bounds']
    rect = f'x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}"'
    head = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {x1-x0} {y1-y0}">'
    ink = [head, f'<title>{family.title()} source-authored connected ink body — candidate</title>',
           '<desc>Independent family cells and repeated glyph placements. Lower body only; source provenance and unresolved text occlusions are recorded in the review JSON.</desc>',
           f'<defs><mask id="{family}-ink" maskUnits="userSpaceOnUse" {rect}>',
           f'<rect {rect} fill="white"/><g fill="black" fill-rule="evenodd">']
    outline = [head, '<g fill="none" stroke="#ee1761" stroke-width=".6">']
    for opening in spec['openings']:
        d = svg_path(authored_path(opening['d']))
        ink.append(f'<path d="{d}"/>')
        dash = ' stroke="#a86500" stroke-dasharray="2 1.5"' if 'interpolated' in opening['evidence'] else ''
        outline.append(f'<path{dash} d="{d}"/>')
    for collection in (ink, outline):
        collection.append('<g transform="translate(448 598)" fill-rule="evenodd">')
        collection.extend(f'<path d="{d}"/>' for d in svg_geometry(model))
        collection.append('</g>')
        collection.extend(f'<path d="{svg_path(p)}"/>' for p in center_paths)
    for occurrence, paths in glyph_paths:
        ink.extend(f'<path d="{svg_path(p)}"/>' for p in paths)
        dash = ' stroke-dasharray="2 1.5"' if 'interpolated' in occurrence['evidence'] else ''
        outline.extend(f'<path stroke="#00a0a0"{dash} d="{svg_path(p)}"/>' for p in paths)
    ink.append('</g><g fill="white">')
    ink.extend(f'<path d="{svg_path(p)}"/>' for p in small)
    ink.append(f'</g></mask></defs><rect {rect} fill="currentColor" mask="url(#{family}-ink)"/></svg>')
    outline.extend(f'<path stroke="#00a0a0" d="{svg_path(p)}"/>' for p in small)
    outline.append('</g></svg>')
    out = DATA / f'review/patterns/{family}-network-body'
    out.mkdir(parents=True, exist_ok=True)
    (ROOT / f'assets/reverse-ink/sv/drafts/{family}-network-body.svg').write_text('\n'.join(ink)+'\n',encoding='utf-8',newline='\n')
    (out / 'boundaries.svg').write_text('\n'.join(outline)+'\n',encoding='utf-8',newline='\n')
    yy,xx = np.mgrid[y0*3:y1*3,x0*3:x1*3].astype('float32')
    for name in spec['sources']:
        row=rows[name];r=row['inner_ring_radius']/105;cx,cy=row['center']
        photo=np.array(Image.open(DATA / f'normalized/{name}.png').convert('RGB'))
        sample=cv2.remap(photo,((xx/3-448)*r+cx)*2.4,((yy/3-598)*r+cy)*2.4,cv2.INTER_LINEAR)
        Image.fromarray(sample).save(out / f'{name}-source.png')
    report = {
        'status':spec['status'], 'family':family, 'sources':spec['sources'], 'bounds':spec['bounds'],
        'source_spec_sha256':hashlib.sha256(file.read_bytes()).hexdigest(),
        'colorless_contours_imported':False, 'opening_count':len(spec['openings']),
        'surrounding_glyph_count':len(glyph_paths), 'surrounding_glyphs':spec.get('glyphs',[]),
        'wheel_glyph_count':11, 'wheel_small_glyph_placement_status':'shared-law-candidate-needs-family-review',
        'limitations':spec['notes'], 'validation':'All three source overlays must be visually reviewed. Counts are not accuracy.'}
    (out / 'review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(f'{family}: {len(spec["openings"])} own-family cells, {len(glyph_paths)} surrounding glyphs, 11 wheel glyphs')


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('family')
    build(parser.parse_args().family)
