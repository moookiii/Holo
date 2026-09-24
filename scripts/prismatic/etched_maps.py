"""Compile explicitly traced physical etching, never print/image-derived relief.

The CLI accepts an audited exact-printing JSON and three authored grayscale PNGs:
foil, protection and region labels. Every nonzero region is explicitly smooth or
etched. Individual etched centerlines are polylines in print-master coordinates;
there is no repeated-line generator, noise, image classifier or gap filling.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RESEARCH = ROOT / 'research/prismatic-evolutions'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def number(value, lo, hi, name):
    require(isinstance(value, (int, float)) and not isinstance(value, bool)
            and math.isfinite(value) and lo <= value <= hi, f'Invalid {name}')
    return float(value)


def validate_evidence(spec, references, photo_root):
    """A source title or a single attractive front cannot unlock map export."""
    identity = spec['cardId'], spec['variant']
    review = next((r for r in references['printingReviews']
                   if (r['cardId'], r['variant']) == identity), None)
    require(review is not None and review.get('evidenceComplete') is True,
            'Exact-printing photographic evidence is incomplete')
    require(spec.get('lineworkReviewed') is True, 'Individual linework review is incomplete')
    photos = {p['file']: p for p in references['photos']
              if (p['cardId'], p['variant']) == identity and p['assessment'] == 'partial-surface'}
    used = {}
    for region in spec['regions']:
        evidence = region.get('evidence', [])
        require(len(evidence) >= 2, f'{region["name"]}: complementary photos required')
        independent = set()
        for item in evidence:
            filename = item['photo']
            require(filename in photos, f'{region["name"]}: wrong card, variant or unusable photo')
            require(bool(item.get('observed', '').strip()), 'Missing region observation')
            photo = (photo_root / filename).resolve()
            require(photo.parent == photo_root.resolve(), 'Photo must stay in the reference directory')
            digest = hashlib.sha256(photo.read_bytes()).hexdigest()
            require(item.get('sha256') == digest, f'{filename}: reference bytes changed')
            independent.add(digest)
            used[filename] = digest
        require(len(independent) >= 2, f'{region["name"]}: duplicate images are not complementary evidence')
        allowed = {e['photo'] for e in evidence}
        for line in region.get('lines', []):
            require(len(set(line.get('photos', []))) >= 2
                    and set(line['photos']) <= allowed,
                    f'{region["name"]}: each traced line needs corroborating region photos')
    return used


def build_maps(spec, foil, protection, labels):
    """Pure numeric compiler; tests use synthetic geometry, never fake card maps.

    Heights and line widths are physical micrometres. Relief depth is an explicit
    rendering calibration, not a measurement inferred from a photograph. Foil and
    print-protection maps never enter the height or normal calculation.
    """
    require(spec.get('version') == 1, 'Unsupported etching schema')
    width, height = spec['mapSize']
    require(all(isinstance(v, int) and 8 <= v <= 8192 for v in (width, height)), 'Invalid mapSize')
    shape = (height, width)
    for name, array in [('foil', foil), ('protection', protection), ('labels', labels)]:
        require(array.shape == shape and array.dtype == np.uint8, f'{name}: expected registered 8-bit grayscale')
    cw, ch = [number(v, 1, 10000, 'coordinates') for v in spec['coordinates']]
    cmw, cmh = [number(v, .1, 100, 'dimensionsCm') for v in spec['dimensionsCm']]
    range_um = number(spec['heightRangeMicrons'], .01, 100, 'height range')
    pixel_um = np.array([cmw * 10000 / width, cmh * 10000 / height])
    coord_um = np.array([cmw * 10000 / cw, cmh * 10000 / ch])
    region_ids = [r['label'] for r in spec['regions']]
    require(all(isinstance(i, int) and 1 <= i <= 255 for i in region_ids)
            and len(set(region_ids)) == len(region_ids), 'Region labels must be unique nonzero bytes')
    require(set(np.unique(labels)) <= {0, *region_ids}, 'Unreviewed region labels')
    require(not np.any((labels == 0) & (foil > 0)), 'Foil extends into an unreviewed region')

    relief = np.zeros(shape, dtype=np.float32)
    normal = np.zeros((*shape, 3), dtype=np.float32)
    normal[:, :, 2] = 1
    direction = np.zeros((*shape, 4), dtype=np.float32)
    direction[:, :, :3] = [1, .5, 1 / 3]  # unit relative pitch; alpha zero outside authored lines
    roughness = np.full(shape, .48, dtype=np.float32)

    for region in spec['regions']:
        mask = labels == region['label']
        require(mask.any(), f'{region["name"]}: empty region')
        roughness[mask] = number(region['roughness'], .045, 1, 'roughness')
        require(region['kind'] in ('smooth', 'etched'), 'Every region needs a surface classification')
        if region['kind'] == 'smooth':
            require(not region.get('lines'), 'Smooth regions cannot contain relief lines')
            continue
        require(bool(region.get('lines')), 'Etched region lacks individually traced lines')
        nearest = np.full(shape, np.inf, dtype=np.float32)
        local_height = np.zeros(shape, dtype=np.float32)
        local_direction = np.zeros((*shape, 4), dtype=np.float32)
        for line in region['lines']:
            points = np.asarray(line['points'], dtype=np.float64)
            require(points.ndim == 2 and points.shape[1] == 2 and len(points) >= 2
                    and np.isfinite(points).all(), 'A trace needs finite XY points')
            require((points >= 0).all() and (points <= [cw, ch]).all(), 'Trace leaves the print master')
            points *= coord_um
            half_width = number(line['halfWidthMicrons'], .01, 1000, 'ridge half width')
            ridge = number(line['ridgeMicrons'], 0, range_um, 'ridge height')
            valley = number(line['valleyMicrons'], 0, range_um, 'valley depth')
            pitch = number(line['relativeGratingPeriod'], .5, 2, 'relative grating period')
            require(ridge + valley > 0, 'An etched line needs nonzero relief')
            radius = half_width * 2
            for start, end in zip(points[:-1], points[1:]):
                delta = end - start
                length2 = float(delta @ delta)
                require(length2 > 0, 'Duplicate trace points')
                lower = np.maximum(0, np.floor((np.minimum(start, end)-radius)/pixel_um).astype(int))
                upper = np.minimum([width, height], np.ceil((np.maximum(start, end)+radius)/pixel_um).astype(int))
                x0, y0 = lower; x1, y1 = upper
                if x0 >= x1 or y0 >= y1:
                    continue
                yy, xx = np.mgrid[y0:y1, x0:x1]
                px = (xx+.5)*pixel_um[0]-start[0]
                py = (yy+.5)*pixel_um[1]-start[1]
                t = np.clip((px*delta[0]+py*delta[1])/length2, 0, 1)
                distance = np.hypot(px-t*delta[0], py-t*delta[1]) / half_width
                cut = (distance < 2) & (distance < nearest[y0:y1, x0:x1])
                # A compact ridge with two recessed flanks. No relief propagates
                # beyond the explicitly traced finite polyline's footprint.
                raised = ridge * np.cos(np.minimum(distance, 1)*np.pi/2)**2
                recessed = valley * np.sin(np.clip(distance-1, 0, 1)*np.pi)**2
                nearest[y0:y1, x0:x1][cut] = distance[cut]
                local_height[y0:y1, x0:x1][cut] = (raised-recessed)[cut]
                # Grating momentum axis is perpendicular to the ridge tangent.
                # Convert image-down Y to the renderer's +Y-up tangent frame.
                angle = math.atan2(delta[0], delta[1])
                local_direction[y0:y1, x0:x1][cut] = [
                    math.cos(2*angle)*.5+.5, math.sin(2*angle)*.5+.5, (pitch-.5)/1.5, 1]
        require(np.any(mask & np.isfinite(nearest)), f'{region["name"]}: traces miss their region')
        # Differentiate the traced physical surface before clipping the region.
        # Region/ink silhouettes must not acquire an invented raised outline.
        gy, gx = np.gradient(local_height, pixel_um[1], pixel_um[0])
        local_normal = np.stack([-gx, gy, np.ones(shape, dtype=np.float32)], axis=2)
        local_normal /= np.linalg.norm(local_normal, axis=2, keepdims=True)
        normal[mask] = local_normal[mask]
        relief[mask] = local_height[mask]
        active = mask & np.isfinite(nearest)
        direction[active] = local_direction[active]

    byte = lambda array: np.rint(np.clip(array, 0, 1)*255).astype(np.uint8)
    return {'foil': foil.copy(), 'protection': protection.copy(),
            'height': byte(.5+relief/(2*range_um)), 'normal': byte(normal*.5+.5),
            'direction': byte(direction), 'roughness': byte(roughness)}


def compile_file(source, output):
    source, output = source.resolve(), output.resolve()
    spec = json.loads(source.read_text(encoding='utf-8'))
    references = json.loads((RESEARCH / 'references.json').read_text(encoding='utf-8'))
    used = validate_evidence(spec, references, RESEARCH / 'photos')
    require(spec.get('depthCalibration', '').strip(), 'Document depth calibration and its uncertainty')
    arrays, inputs = {}, {}
    for key in ('foil', 'protection', 'regions'):
        path = (source.parent / spec['inputs'][key]).resolve()
        require(path.is_relative_to(source.parent), 'Input must stay in the authoring directory')
        with Image.open(path) as img:
            require(img.mode == 'L', f'{key}: use explicit grayscale; do not pass a photograph')
            arrays[key] = np.asarray(img).copy()
        inputs[key] = hashlib.sha256(path.read_bytes()).hexdigest()
    maps = build_maps(spec, arrays['foil'], arrays['protection'], arrays['regions'])
    prefix = f'{spec["cardId"]}-{spec["variant"]}'
    require('/' not in prefix and '\\' not in prefix and '..' not in prefix, 'Invalid output identity')
    # No directory or partial maps are written before all validation succeeds.
    output.mkdir(parents=True, exist_ok=True)
    hashes = {}
    for key, array in maps.items():
        path = output / f'{prefix}-{key}.png'
        Image.fromarray(array).save(path)
        hashes[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
    manifest = {'cardId': spec['cardId'], 'variant': spec['variant'], 'textured': True,
                'authoring': 'Individually traced exact-card ridges. No print-derived height, repeated synthetic lines, random noise or continuation into untraced areas.',
                'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                'references': used, 'inputs': inputs, 'maps': hashes,
                'heightRangeMicrons': spec['heightRangeMicrons'], 'depthCalibration': spec['depthCalibration'],
                'mapSettings': {'normalScale': 1, 'embossStrength': 0, 'roughnessMode': 'absolute'},
                'rendering': 'Normal contains the full traced relief; keep height displacement off to avoid counting it twice. Use the plain field, no procedural engraving/glints/facet override, and the supplied direction map.'}
    (output / f'{prefix}-evidence.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    result = compile_file(args.source, args.output)
    print(f'{result["cardId"]}:{result["variant"]}: compiled six registered maps from audited traces')
