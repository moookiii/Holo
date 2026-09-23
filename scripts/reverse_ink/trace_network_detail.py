"""Render an explicitly authored dark-band detail and independent photo checks.

The traced light openings are holes in one connected positive ink field. Photo
texture, threshold contours, and the rejected fitted pebble are never exported.
"""
import json
import sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from normalize import DATA, ROOT
from fit_symbol import sample_path, svg_path


def main():
    spec = json.loads((DATA / 'references/colorless-network-detail.json').read_text())
    x0, y0, x1, y1 = spec['bounds']
    width, height = x1 - x0, y1 - y0
    paths = spec['openings']
    rect = f'M {x0} {y0} H {x1} V {y1} H {x0} Z'
    d = rect + ' ' + ' '.join(svg_path(path) for path in paths)
    target = ROOT / 'assets/reverse-ink/sv/details'
    target.mkdir(exist_ok=True)
    (target / 'colorless-dark-network.svg').write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {width} {height}">\n'
        '<title>Colorless: corrected connected dark-band detail</title>\n'
        '<desc>Dark photo bands are positive ink. Manually traced lighter openings '
        'are subtracted. Bounded evidence detail, not a complete master or a shared '
        'eleven-family field. See colorless-network-detail.json.</desc>\n'
        f'<path fill="currentColor" fill-rule="evenodd" d="{d}"/>\n</svg>\n',
        encoding='utf-8')

    scale = 4
    size = (width * scale, height * scale)
    offset = np.array([x0, y0])
    contours = [(sample_path(p, 60) - offset) * scale for p in paths]
    mask = Image.new('L', size, 255)
    draw = ImageDraw.Draw(mask)
    for contour in contours:
        draw.polygon([tuple(point) for point in contour], fill=0)
    rows = {r['id']: r for r in json.loads((DATA / 'review/radial/measurements.json').read_text())}
    out = DATA / 'review/patterns/dark-network-correction'
    out.mkdir(exist_ok=True)
    photos = {}
    signed_checks = []
    yy, xx = np.mgrid[:size[1], :size[0]].astype('float32')
    for name in spec['sources']:
        row = rows[name]
        ratio = row['inner_ring_radius'] / 105
        cx, cy = row['center']
        original = np.array(Image.open(DATA / 'normalized' / f'{name}.png').convert('RGB'))
        raw = cv2.remap(original,
            ((xx / scale + x0 - 448) * ratio + cx) * 2.4,
            ((yy / scale + y0 - 598) * ratio + cy) * 2.4,
            cv2.INTER_LINEAR)
        photo = Image.fromarray(raw)
        photos[name] = photo
        overlay = photo.copy()
        pen = ImageDraw.Draw(overlay)
        for contour in contours:
            pen.line([tuple(p) for p in contour], fill='#ed2166', width=2)
        overlay.save(out / f'{name}-boundaries.png')
        photo.save(out / f'{name}-source.png')
        # Check the SIDE of the photographic edge, not just its magnitude.
        # Foreground occlusion and residual registration limit secondary scores.
        luminance = cv2.cvtColor(raw, cv2.COLOR_RGB2GRAY).astype('float32') / 255
        luminance = cv2.GaussianBlur(luminance, (0, 0), scale * .7)
        for path, contour in zip(paths, contours):
            tangent = np.roll(contour, -1, axis=0) - np.roll(contour, 1, axis=0)
            normal = np.c_[-tangent[:, 1], tangent[:, 0]]
            normal /= np.maximum(np.linalg.norm(normal, axis=1)[:, None], .001)
            margin = 3 * scale
            keep = ((contour[:, 0] > margin) & (contour[:, 0] < size[0] - margin)
                    & (contour[:, 1] > margin) & (contour[:, 1] < size[1] - margin))
            points = contour[keep]
            if len(points) == 0:
                continue
            inside = points + normal[keep] * 2 * scale
            outside = points - normal[keep] * 2 * scale
            def read(points):
                return cv2.remap(luminance, points[:, 0].astype('float32')[:, None],
                    points[:, 1].astype('float32')[:, None], cv2.INTER_LINEAR).ravel()
            difference = read(inside) - read(outside)
            signed_checks.append({'source': name, 'opening': path['id'],
                'median_light_minus_dark': round(float(np.median(difference)), 5),
                'fraction_correct_polarity': round(float(np.mean(difference > 0)), 4),
                'samples': len(points)})

    clean = Image.new('RGB', size, '#eeeee5')
    clean.paste('#747970', (0, 0, *size), mask)
    clean.save(out / 'ink-detail.png')
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 23)
    small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
    sheet = Image.new('RGB', (size[0] * 2 + 36, size[1] * 2 + 140), '#fafaf8')
    pen = ImageDraw.Draw(sheet)
    images = [photos['lickitung'], Image.open(out / 'lickitung-boundaries.png'), clean,
              Image.open(out / 'pidgey-boundaries.png')]
    labels = ['Lickitung reference', 'Retraced band boundaries',
              'Positive dark ink / light openings', 'Same trace on Pidgey']
    for i, (im, label) in enumerate(zip(images, labels)):
        x = 12 + (i % 2) * (size[0] + 12)
        y = 44 + (i // 2) * (size[1] + 48)
        sheet.paste(im, (x, y))
        pen.text((x, y - 31), label, fill='#292d28', font=font)
    pen.text((12, sheet.height - 33),
             'Bounded Colorless detail. The full eleven-family reconstruction is still in progress.',
             fill='#555b51', font=small)
    sheet.save(out / 'comparison.png')
    report = {
        'status': spec['status'], 'family': spec['family'],
        'bounds': spec['bounds'], 'positive_geometry': 'dark connected photo bands',
        'sources': spec['sources'], 'curve_count': sum(len(p['curves']) for p in paths),
        'automatic_trace_used': False,
        'signed_edge_checks': signed_checks,
        'check_limitations': 'Secondary photo checks include foreground text and registration error. Positive signed contrast checks the correct side of the band, not exact contour accuracy.',
        'replaces': 'rejected left-bottom-sliver fitted polygon',
        'limitations': spec['limitations'],
    }
    (out / 'review.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Exported one connected dark-ink detail with {len(paths)} openings and three photo checks')


def verify_svg_render():
    """Check the actual browser export, including landmarks from the photo."""
    out = DATA / 'review/patterns/dark-network-correction'
    actual = np.array(Image.open(out / 'svg-render.png').convert('RGB'))[:, :, 0] < 160
    sampled = np.array(Image.open(out / 'ink-detail.png').convert('RGB'))[:, :, 0] < 160
    count, _ = cv2.connectedComponents(np.uint8(actual))
    agreement = float(np.mean(actual == sampled))
    assert count - 1 == 1, 'The dark junction must remain connected'
    assert agreement > .99, 'SVG rendering differs from the authored boundary preview'
    checks = []
    # Points are independent observations on the source, including the band
    # crossing the user's rejected triangle, not samples chosen from the SVG.
    for x, y, dark in [(88, 694, True), (105, 710, True), (155, 701, True),
                       (180, 713, True), (90, 677, False), (145, 686, False),
                       (190, 700, False)]:
        got = bool(actual[round((y - 645) * 4), round((x - 60) * 4)])
        assert got == dark, f'Source landmark {(x, y)} has incorrect ink polarity'
        checks.append({'point': [x, y], 'dark_band_expected': dark, 'svg_is_dark': got})
    report = json.loads((out / 'review.json').read_text())
    report['browser_validation'] = {
        'renderer': 'Microsoft Edge / Playwright',
        'svg_vs_sampled_path_raster_agreement': round(agreement, 6),
        'connected_dark_components': count - 1, 'source_landmark_checks': checks}
    (out / 'review.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('SVG check: one connected ink field; all seven photo landmarks retain their polarity')


if __name__ == '__main__':
    if '--verify-svg-render' in sys.argv:
        verify_svg_render()
    else:
        main()
