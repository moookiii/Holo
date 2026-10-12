"""Convert exact BW TCGL etch layers to offline OpenGL tangent normals.

The source atlas is registered to Holo's established full-card BW UV box before
the Sylveon 156 Scharr conversion. Foil plate near-black glyphs flatten the
normal after differentiation; the continuous etch is never clipped first.
"""
from pathlib import Path
import hashlib
import json
import sys
from concurrent.futures import ThreadPoolExecutor

sys.dont_write_bytecode = True
import cv2
import numpy as np
from PIL import Image
from prepare_swsh_proofs import registered

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'research/tcgl/bw-series/dataset/manifest.json'
OUT = ROOT / 'public/cards/pokemon/tcgl-bw'
SIZE = (1800, 2475)
GAIN = 1.03


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def convert(entry):
    cid = entry['card_id']
    target = OUT / cid
    if (target / 'normal.png').exists() and (target / 'normal-evidence.json').exists():
        return
    original = target / 'original-etch.png'
    front = target / 'original-front.png'
    foil = target / 'original-foil.png'
    assert all(p.exists() for p in (original, front, foil)), cid
    assert digest(original) == entry['assets']['etch']['texture']['png_sha256'], cid
    etch = registered(Image.open(original).convert('RGBA'), (733, 1024))
    src = np.asarray(etch, dtype=np.float32) / 255.0
    height = cv2.resize(1.0 - src[..., :3].mean(axis=2), SIZE, interpolation=cv2.INTER_LINEAR)
    alpha = cv2.resize(src[..., 3], SIZE, interpolation=cv2.INTER_LINEAR)

    # TCGL's own foil plate marks opaque lettering close to black. Preserve
    # the antialiased glyph edges without selecting pale printed artwork.
    foil_card = registered(Image.open(foil).convert('RGB'), (733, 1024))
    foil_gray = np.asarray(foil_card.convert('L'), dtype=np.float32) / 255.0
    protected = cv2.resize(np.clip((0.22 - foil_gray) / 0.14, 0, 1), SIZE,
                           interpolation=cv2.INTER_LINEAR)
    Image.fromarray(np.rint(protected * 255).astype(np.uint8), 'L').save(target / 'protection.png')
    # The exact TCGL whiteplate contains card-specific subject modulation.
    # Retain that continuous material weighting, excluding protected ink; no
    # brightness from the printed front is used to author roughness.
    body = cv2.resize(1.0 - foil_gray, SIZE, interpolation=cv2.INTER_LINEAR) * (1.0 - protected)
    secondary = np.zeros_like(body)  # No distinct secondary region is verified.
    roughness = (0.30 + 0.105 * body) * (1.0 - secondary) + 0.27 * secondary
    Image.fromarray(np.rint(body * 255).astype(np.uint8), 'L').save(target / 'body.png')
    Image.fromarray(np.rint(roughness * 255).astype(np.uint8), 'L').save(target / 'roughness.png')

    dx = cv2.Scharr(height, cv2.CV_32F, 1, 0, scale=1 / 32)
    drow = cv2.Scharr(height, cv2.CV_32F, 0, 1, scale=1 / 32)
    nx = -dx * GAIN * (1.0 - protected)
    ny = drow * GAIN * (1.0 - protected)
    length = np.sqrt(nx * nx + ny * ny + 1.0)
    normal = np.stack((nx / length, ny / length, 1.0 / length), axis=2)
    normal = normal * alpha[..., None] + np.array([0, 0, 1], dtype=np.float32) * (1.0 - alpha[..., None])
    normal_path = target / 'normal.png'
    Image.fromarray(np.rint(np.clip(normal * .5 + .5, 0, 1) * 255).astype(np.uint8), 'RGB').save(normal_path)
    evidence = {
        'tcglCardId': cid, 'tcglVariantId': entry['long_form_id'],
        'source': str(original.relative_to(ROOT)).replace('\\', '/'),
        'pairedFront': str(front.relative_to(ROOT)).replace('\\', '/'),
        'sourceUrl': entry['assets']['etch']['bundle_source']['url'],
        'sourceDimensions': list(Image.open(original).size), 'cardUvDimensions': [733, 1024],
        'outputDimensions': list(SIZE), 'sourceSha256': digest(original),
        'frontSha256': digest(front), 'foilSha256': digest(foil),
        'normalSha256': digest(normal_path),
        'protectionSha256': digest(target / 'protection.png'),
        'bodySha256': digest(target / 'body.png'), 'roughnessSha256': digest(target / 'roughness.png'),
        'roughness': '(0.30 + 0.105 * own TCGL material subject weighting) * (1-secondary) + 0.27 * secondary',
        'secondaryRegion': 'No verified separately masked microdiamond region; zero coverage',
        'uvBox': [145 / 1024, 0, 878 / 1024, 1],
        'polarity': 'inverted luminance; white strokes recess', 'verticalFlip': False,
        'operations': 'Mean RGB, invert, full-card bilinear resize, Scharr CV_32F scale 1/32, tangent slopes (-dx,+drow) with gain 1.03; apply TCGL foil glyph protection after derivatives; normalize; alpha blend flat normals; opaque RGB encoding.',
        'embossStrength': 0, 'runtimeGeneration': False,
        'limitations': 'TCGL line geometry does not establish measured physical groove depth. Near-black foil-plate protection is source-derived and may include dark artwork.',
    }
    (target / 'normal-evidence.json').write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf-8')
    print(cid, flush=True)


def main():
    cv2.setNumThreads(1)
    from import_bw import treatment
    entries = [entry for entry in json.loads(SOURCE.read_text(encoding='utf-8'))
               if entry['assets']['etch']['status'] == 'extracted'
               and treatment(entry, {}, 'holo')[0] == 'prismatic_sir_texture']
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(convert, entries))


if __name__ == '__main__':
    main()
