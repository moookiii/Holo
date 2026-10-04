"""Build Sylveon 156's tangent normal from its paired TCGL etched layer.

The source is a full-card etch map; white groove strokes are depressions, so
height polarity is inverted. No blur, denoising, relief synthesis, or runtime
processing is used. Holo stores maps in top-down raster order and uses the
existing Prismatic normal convention (-dH/dx, +dH/drow, +Z).
"""
from pathlib import Path
import hashlib, json
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'research/tcgl/sv08.5-156/sv8-5_en_156_std.etch.png'
DEST = ROOT / 'public/cards/pokemon/prismatic-evolutions/maps/156-holo-normal.png'
HEIGHT_DEST = DEST.with_name('156-holo-height.png')
ROUGHNESS_DEST = DEST.with_name('156-holo-roughness.png')
EVIDENCE = ROOT / 'public/cards/pokemon/prismatic-evolutions/maps/156-holo-evidence.json'
PROTECTION = ROOT / 'public/cards/pokemon/prismatic-evolutions/maps/156-holo-protection.png'
SIZE = (1800, 2475)
SLOPE_GAIN = 1.03  # matches Espeon 155 primary etched-background RMS slope (~0.183)


def main():
    raw = Image.open(SOURCE).convert('RGBA')
    src = np.asarray(raw, dtype=np.float32) / 255.0
    # Use the etched layer's luminance directly as its line geometry. Downward
    # etch strokes are lower than their surrounding unetched foil.
    luminance = src[..., :3].mean(axis=2)
    height = 1.0 - luminance
    height = cv2.resize(height, SIZE, interpolation=cv2.INTER_LINEAR)
    alpha = cv2.resize(src[..., 3], SIZE, interpolation=cv2.INTER_LINEAR)
    protected = np.asarray(Image.open(PROTECTION).convert('L'), dtype=np.float32) / 255.0

    # Differentiation uses the unsmoothed source-derived height field. Scharr
    # retains narrow TCGL grooves while providing a calibrated pixel derivative.
    dx = cv2.Scharr(height, cv2.CV_32F, 1, 0, scale=1 / 32)
    drow = cv2.Scharr(height, cv2.CV_32F, 0, 1, scale=1 / 32)
    nx = -dx * SLOPE_GAIN
    ny = drow * SLOPE_GAIN
    # Differentiate the continuous TCGL field first, then flatten authored
    # protected print glyphs/panels; this avoids false bevels at protection edges.
    nx *= 1.0 - protected
    ny *= 1.0 - protected
    nz = np.ones_like(height)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.stack((nx / length, ny / length, nz / length), axis=2)
    # Pixels outside the original rounded card image have no etched relief.
    normal = normal * alpha[..., None] + np.array([0.0, 0.0, 1.0]) * (1.0 - alpha[..., None])
    encoded = np.rint(np.clip(normal * 0.5 + 0.5, 0, 1) * 255).astype(np.uint8)
    # Protect relief in RGB itself. Keep opaque normal pixels so decoding and
    # filtering cannot turn transparent protected areas into invalid normals.
    Image.fromarray(encoded, 'RGB').save(DEST, optimize=True)
    # Retain the continuous TCGL height for inspection. Live relief uses only
    # the precomputed normal, matching Espeon 155; height emboss is disabled.
    encoded_height = np.rint((0.5 + (height - 0.5) * 0.25) * 255).astype(np.uint8)
    Image.fromarray(encoded_height, 'L').save(HEIGHT_DEST, optimize=True)
    maps_dir = DEST.parent
    body = np.asarray(Image.open(maps_dir / '156-holo-body.png').convert('L'), dtype=np.float32) / 255.0
    secondary = np.asarray(Image.open(maps_dir / '156-holo-secondary-foil.png').convert('L'), dtype=np.float32) / 255.0
    # Espeon's material response, using Sylveon's existing region boundaries.
    roughness = (0.30 + 0.105 * body) * (1.0 - secondary) + 0.27 * secondary
    Image.fromarray(np.rint(roughness * 255).astype(np.uint8), 'L').save(ROUGHNESS_DEST, optimize=True)

    evidence = json.loads(EVIDENCE.read_text())
    evidence['maps']['156-holo-normal.png'] = hashlib.sha256(DEST.read_bytes()).hexdigest()
    evidence['maps']['156-holo-height.png'] = hashlib.sha256(HEIGHT_DEST.read_bytes()).hexdigest()
    evidence['maps']['156-holo-roughness.png'] = hashlib.sha256(ROUGHNESS_DEST.read_bytes()).hexdigest()
    evidence['heightSource'] = dict(file=str(SOURCE.relative_to(ROOT)), dimensions=list(raw.size),
        operation='Unfiltered inverted TCGL etch luminance, full-domain bilinear resize; encode 0.5 + (height - 0.5) * 0.25.',
        embossStrength=0, normalScale=1,
        note='Height is retained for inspection. The precomputed protected TCGL normal supplies the single active surface response, matching Espeon 155.')
    evidence['finishReference'] = dict(cardId='sv08.5-155', variant='holo',
        normalResponse='Precomputed OpenGL tangent normals; normalScale 1; embossStrength 0.',
        calibration='Primary etched-background normal RMS slope approximately 0.183, measured outside body, secondary foil and protected print.',
        roughness='0.30 background, 0.405 body, 0.27 secondary foil; blended with the existing Sylveon body and secondary foil maps.',
        surface=dict(metalness=0.50, laminate=0.045, foilReflectance=0.025, etchedInkSheen=0.85))
    evidence['normalSource'] = {
        'file': 'research/tcgl/sv08.5-156/sv8-5_en_156_std.etch.png',
        'sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'dimensions': list(raw.size),
        'operation': 'Full-domain resize to 1800x2475; white etched strokes interpreted as recessed height (luminance inverted); Scharr derivatives on the unfiltered continuous height field; existing protection PNG applied to slopes after differentiation; encode (-dH/dx, +dH/drow, +Z) in Holo OpenGL +Y tangent convention.',
        'verticalFlip': False,
        'cropOrOffset': False,
        'slopeGain': SLOPE_GAIN,
        'runtimeGeneration': False,
    }
    evidence['mapSize'] = [*SIZE]
    evidence['status'] = 'tcgl-etch-derived'
    evidence['limitations'] = 'TCGL supplies etch line geometry, not calibrated physical groove depth. Tangent slope gain and surface finish are matched to Holo Espeon 155; absolute physical depth is not inferred from the reference photo. No denoising, generated geometry, or added texture is used.'
    EVIDENCE.write_text(json.dumps(evidence, indent=2) + '\n')


if __name__ == '__main__':
    main()
