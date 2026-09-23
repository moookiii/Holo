"""Photographic paired-patch estimates for eleven single-color ink families.

No substrate calibration is available. Export observations separately from a
declared equivalent-ink convention; neither is a physical pigment measurement.
"""
import json
import math
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from normalize import DATA, ROOT
from reconstruct_wheel import polar


def linear(rgb):
    value = np.asarray(rgb) / 255
    return np.where(value <= .04045, value / 12.92, ((value + .055) / 1.055) ** 2.4)


def srgb(value):
    value = np.clip(value, 0, 1)
    return np.where(value <= .0031308, value * 12.92, 1.055 * value ** (1 / 2.4) - .055) * 255


def hexcolor(rgb):
    return '#' + ''.join(f'{int(v):02x}' for v in np.round(np.clip(rgb, 0, 255)))


def main():
    manifest = json.loads((DATA / 'references/manifest.json').read_text())
    rows = {r['id']: r for r in json.loads((DATA / 'review/radial/measurements.json').read_text())}
    out = DATA / 'review/color'
    out.mkdir(exist_ok=True)
    all_sources = []
    by_family = {f: [] for f in manifest['families']}
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
    for record in manifest['references']:
        if record['role'] != 'reverse-reference':
            continue
        name = record['id']
        row = rows[name]
        source = np.array(Image.open(DATA / 'normalized' / f'{name}.png').convert('RGB'))
        if row['review_status'] == 'rejected':
            all_sources.append({'source': name, 'family': record['family'],
                'status': 'excluded-unreliable-wheel-registration', 'reason': row['review_reason']})
            continue
        cx, cy = row['center']
        ratio = row['inner_ring_radius'] / 105
        patch_offsets = np.array([[x, y] for y in np.arange(-1, 1.01, .25)
                                  for x in np.arange(-1, 1.01, .25) if x*x+y*y <= 1])
        preview = Image.fromarray(source).resize((630, 880))
        pen = ImageDraw.Draw(preview)
        patches = []
        for spoke in range(10):
            for radius in [68, 99]:
                centers = [np.array([cx, cy]) + polar(radius * ratio, spoke * 36 + angle)
                           for angle in [0, -8, 8]]
                samples = []
                scatters = []
                clipped = False
                for center in centers:
                    coords = (center + patch_offsets * ratio) * 2.4
                    rgb = cv2.remap(source, coords[:, 0].astype('float32')[:, None],
                                   coords[:, 1].astype('float32')[:, None], cv2.INTER_LINEAR).reshape(-1, 3)
                    samples.append(np.median(rgb, axis=0))
                    scatters.append(float(np.max(np.percentile(rgb, 90, axis=0)-np.percentile(rgb, 10, axis=0))))
                    clipped |= bool(np.mean(rgb >= 252) > .15 or np.mean(rgb <= 3) > .15)
                dark, left, right = map(linear, samples)
                bright = (left + right) / 2
                lum = np.array([.2126, .7152, .0722])
                attenuation = 1 - float((dark @ lum) / max(bright @ lum, 1e-5))
                asymmetry = float(np.max(abs(left-right) / np.maximum(bright, .025)))
                reasons = []
                if clipped:
                    reasons.append('channel-clipping')
                if max(scatters) > 42:
                    reasons.append('patch-variation-text-or-texture')
                if asymmetry > .28:
                    reasons.append('light-neighbor-disagreement')
                if not .04 < attenuation < .90:
                    reasons.append('weak-or-excessive-darkening')
                if np.any(dark > bright * 1.08):
                    reasons.append('channel-polarity-disagreement')
                item = {'spoke': spoke, 'radius': radius,
                    'centers_card_space': np.round(centers, 4).tolist(),
                    'observed_dark_srgb': np.round(samples[0], 2).tolist(),
                    'observed_light_srgb': np.round(srgb(bright), 2).tolist(),
                    'linear_channel_ratio': (dark / np.maximum(bright, .005)).tolist(),
                    'relative_black_equivalent_opacity': round(attenuation, 5),
                    'light_neighbor_asymmetry': round(asymmetry, 4),
                    'max_patch_srgb_spread': round(max(scatters), 2),
                    'status': 'candidate-pair' if not reasons else 'excluded', 'exclusion_reasons': reasons}
                patches.append(item)
                for center, color in zip(centers, ['#e92375', '#00a3dc', '#00a3dc']):
                    x, y = center
                    pen.ellipse((x-2, y-2, x+2, y+2), outline=color if not reasons else '#777777', width=1)
                x, y = centers[0]
                if not reasons:
                    pen.text((x+3, y-4),f'{spoke}:{radius}',font=font,fill='#e92375')
        preview.crop((275, 440, 615, 750)).resize((680, 620)).save(out / f'{name}-samples.png')
        candidates = [p for p in patches if p['status'] == 'candidate-pair']
        result = {'source': name, 'family': record['family'], 'status': 'candidate-source' if len(candidates)>=3 else 'excluded-too-few-pairs',
                  'valid_pair_count': len(candidates), 'pairs': patches}
        if len(candidates)>=3:
            result['median_linear_channel_ratio'] = np.median([p['linear_channel_ratio'] for p in candidates], axis=0).tolist()
            result['median_relative_black_equivalent_opacity'] = float(np.median([p['relative_black_equivalent_opacity'] for p in candidates]))
            result['observed_dark_srgb'] = np.median([p['observed_dark_srgb'] for p in candidates], axis=0).tolist()
            result['observed_light_srgb'] = np.median([p['observed_light_srgb'] for p in candidates], axis=0).tolist()
            by_family[record['family']].append(result)
        all_sources.append(result)
    families = []
    for family, sources in by_family.items():
        if not sources:
            families.append({'family': family, 'status': 'insufficient-paired-evidence'})
            continue
        ratios = np.array([s['median_linear_channel_ratio'] for s in sources])
        ratio = np.clip(np.median(ratios, axis=0), 0, 1)
        observed_dark = np.median([s['observed_dark_srgb'] for s in sources], axis=0)
        observed_light = np.median([s['observed_light_srgb'] for s in sources], axis=0)
        relatives = [s['median_relative_black_equivalent_opacity'] for s in sources]
        families.append({'family': family, 'status': 'uncalibrated-estimate-review-required',
            'sources': [s['source'] for s in sources], 'candidate_pair_count': sum(s['valid_pair_count'] for s in sources),
            'observed_dark_hex': hexcolor(observed_dark), 'observed_light_hex': hexcolor(observed_light),
            'relative_black_equivalent_opacity': round(float(np.median(relatives)), 4),
            'relative_opacity_source_range': np.round([min(relatives), max(relatives)], 4).tolist(),
            'single_color_estimate': {'color_srgb_hex': hexcolor(observed_dark),
                'meaning': 'One observed dark-field color per family, equal-weight median across supplied photos; a conservative apparent-color estimate, not calibrated pigment reflectance.',
                'physical_pigment_color': None, 'physical_opacity': None,
                'do_not_apply_as_color_plus_alpha': 'The observed color already includes the substrate and photography. Relative black-equivalent opacity describes local contrast separately; applying both as an alpha layer would count the darkening twice.'},
            'linear_channel_ratio': np.round(ratio, 5).tolist(),
            'source_ratio_range': np.round([ratios.min(axis=0), ratios.max(axis=0)], 5).tolist()})
    report = {'status': 'uncalibrated-photographic-estimates',
        'method': 'Three small neighboring samples per spoke at r68 and r99; dark spoke compared to its light neighbors at +/-8 degrees. Median within source, then equal-weight median across source photos.',
        'limitations': ['Sampling is diagnostic; it creates no card-foreground protection mask.',
            'Foreground, print texture, reflections and registration can survive automatic exclusions. Review each source sample sheet.',
            'The plain Lickitung is not an exposure-matched calibration and is not used for pigment estimation.',
            'Single-color values are apparent dark-field estimates. Many physical pigment/opacity pairs fit the same photographs.',
            'Source ranges are observed variation, not confidence intervals. Colorless/Metal/Trainer neutrality can be shifted by lighting.'],
        'families': families, 'references': all_sources}
    (out / 'measurements.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8', newline='\n')
    # Review sheets and a compact asset-side estimate file are reproducible.
    for group in range(3):
        contact = Image.new('RGB', (1360, 1020), '#eeeee9')
        draw = ImageDraw.Draw(contact)
        for i, family in enumerate(manifest['families']):
            sources = [s for s in all_sources if s['family'] == family
                       and s['status'] != 'excluded-unreliable-wheel-registration']
            if group >= len(sources):
                continue
            source = sources[group]
            tile = Image.open(out / f'{source["source"]}-samples.png').resize((340, 310))
            x, y = (i % 4) * 340, (i // 4) * 340
            contact.paste(tile, (x, y + 28))
            draw.text((x + 4, y + 5), f'{source["source"]}: {source["valid_pair_count"]} candidate pairs', fill='black', font=font)
        contact.save(out / f'sample-contact-{group + 1}.png')
    palette = Image.new('RGB', (1050, 80 + len(families)*65), '#f5f5f0')
    draw = ImageDraw.Draw(palette)
    title = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 25)
    draw.text((20, 12), 'Eleven families: photographic color / contrast estimates', fill='#222522', font=title)
    draw.text((20, 48), 'Observed dark and light areas. Percent = relative luminance darkening, not physical pigment alpha.', fill='#545951', font=font)
    lines = ['# Apparent ink color and relative contrast', '',
             'These are uncalibrated photo-based estimates. Percent is black-equivalent local luminance attenuation, not measured physical opacity. Do not apply the apparent color and attenuation as a combined alpha layer.', '',
             '| Family | Apparent dark | Adjacent light | Relative darkening | Source range | Pairs |',
             '|---|---|---|---:|---:|---:|']
    for i, family in enumerate(families):
        y = 83 + i*65
        draw.text((20, y+12), family['family'].capitalize(), fill='#222522', font=title)
        if 'observed_dark_hex' not in family:
            continue
        dark, light = family['observed_dark_hex'], family['observed_light_hex']
        draw.rectangle((205, y+3, 310, y+49), fill=dark)
        draw.rectangle((315, y+3, 420, y+49), fill=light)
        lo, hi = family['relative_opacity_source_range']
        percent = family['relative_black_equivalent_opacity']*100
        draw.text((445, y+6), f'{dark} / {light}', fill='#30372e', font=font)
        draw.text((445, y+29), f'{percent:.1f}% relative darkening; sources {lo*100:.1f}-{hi*100:.1f}%', fill='#30372e', font=font)
        draw.text((815, y+18), f'{family["candidate_pair_count"]} pairs', fill='#30372e', font=font)
        lines.append(f'| {family["family"]} | {dark} | {light} | {percent:.1f}% | {lo*100:.1f}-{hi*100:.1f}% | {family["candidate_pair_count"]} |')
    palette.save(out / 'palette.png')
    (out / 'ESTIMATES.md').write_text('\n'.join(lines)+'\n',encoding='utf-8',newline='\n')
    estimates = {'status': report['status'], 'not_runtime_parameters': True,
                 'limitations': report['limitations'], 'families': families}
    (ROOT / 'assets/reverse-ink/sv/ink-estimates.json').write_text(json.dumps(estimates,indent=2)+'\n',encoding='utf-8',newline='\n')
    for family in families:
        print(family['family'],family.get('candidate_pair_count',0),family.get('observed_dark_hex'),family.get('relative_black_equivalent_opacity'),family.get('sources'))


if __name__ == '__main__':
    main()
