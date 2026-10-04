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
EVIDENCE = ROOT / 'public/cards/pokemon/prismatic-evolutions/maps/156-holo-evidence.json'
PROTECTION = ROOT / 'public/cards/pokemon/prismatic-evolutions/maps/156-holo-protection.png'
SIZE = (1800, 2475)
SLOPE_GAIN = 0.12  # restrained tangent slope; normalScale remains 1 in card setup


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
    # Alpha is the relief protection mask. The shader masks the differentiated
    # height slopes with it, rather than differentiating a clipped height field.
    relief_mask = np.rint(alpha * (1.0 - protected) * 255).astype(np.uint8)
    Image.fromarray(np.dstack((encoded, relief_mask)), 'RGBA').save(DEST, optimize=True)
    # Preserve continuous TCGL linework, including across protection boundaries.
    # At embossStrength .25 this range represents a shallow 5 micrometre span.
    encoded_height = np.rint((0.5 + (height - 0.5) * 0.25) * 255).astype(np.uint8)
    Image.fromarray(encoded_height, 'L').save(HEIGHT_DEST, optimize=True)

    evidence = json.loads(EVIDENCE.read_text())
    evidence['maps']['156-holo-normal.png'] = hashlib.sha256(DEST.read_bytes()).hexdigest()
    evidence['maps']['156-holo-height.png'] = hashlib.sha256(HEIGHT_DEST.read_bytes()).hexdigest()
    evidence['heightSource'] = dict(file=str(SOURCE.relative_to(ROOT)), dimensions=list(raw.size),
        operation='Unfiltered inverted TCGL etch luminance, full-domain bilinear resize; encode 0.5 + (height - 0.5) * 0.25. Protection remains in normal PNG alpha and masks height gradients in the shader after differentiation.',
        embossStrength=0.25, normalScale=0, estimatedReliefSpanMicrometres=5,
        note='Height emboss supplies the single active normal response; the TCGL normal RGB remains available for inspection. No mesh displacement.')
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
    evidence['limitations'] = 'TCGL supplies etch line geometry, not calibrated physical groove depth. A restrained tangent slope gain is used to keep the response shallow. No denoising, generated geometry, or added texture is used.'
    EVIDENCE.write_text(json.dumps(evidence, indent=2) + '\n')


if __name__ == '__main__':
    main()
