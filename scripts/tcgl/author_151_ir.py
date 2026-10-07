"""Offline ink transmission and silver-border separation for English 151 IRs.

Existing TCGL foil/protection sources and clean fronts are immutable. Brightness
is used only as an ink absorption estimate, never as height or normal geometry.
"""
from pathlib import Path
import hashlib
import json
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'public/cards/pokemon/151'
OUT = BASE / 'ir'
REVIEW = ROOT / 'artifacts/151-ir/maps'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def save(path, array):
    Image.fromarray(np.rint(np.clip(array, 0, 1) * 255).astype(np.uint8)).save(path)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    records = []
    for number in range(166, 182):
        front_path = BASE / f'{number}.png'
        protection_path = BASE / 'tcgl' / f'{number}-holo-protection.png'
        evidence = json.loads((BASE / 'tcgl' / f'{number}-holo-evidence.json').read_text())
        assert not evidence['textured'], 'Etched printings require the TCGL normal workflow'
        rgba = np.asarray(Image.open(front_path).convert('RGBA'), dtype=np.float32) / 255
        h, w = rgba.shape[:2]
        rgb, alpha = rgba[..., :3], rgba[..., 3]
        linear = np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
        luminance = linear @ np.array([.2126, .7152, .0722])
        transmission = .08 + .92 * np.sqrt(luminance)
        original = np.asarray(Image.open(protection_path).convert('L'), dtype=np.float32) / 255
        protection = cv2.resize(original, (w, h), interpolation=cv2.INTER_LINEAR)
        # Trace the existing opaque outer-frame component, not a rectangular
        # brightness selection. Interior protected glyphs/body remain separate.
        _, labels = cv2.connectedComponents((protection > .8).astype(np.uint8))
        border_label = labels[h // 2, max(1, round(w * .015))]
        assert border_label != 0
        border = (labels == border_label).astype(np.float32)
        # Retain dark printed marks (including copyright and BASIC lettering)
        # inside the silver component. This is transmission, not segmentation.
        metal = border * np.clip((luminance - .025) / .20, 0, 1) * alpha
        # Metallic already contains the ink attenuation; do not attenuate it a
        # second time with the protection channel in map packing.
        revised = protection * (1 - border)
        paths = {'transmission': OUT / f'{number}-transmission.png',
                 'silver': OUT / f'{number}-silver.png',
                 'protection': OUT / f'{number}-protection.png'}
        save(paths['transmission'], transmission)
        save(paths['silver'], metal)
        # Preserve original full-resolution protection outside the border.
        full_border = cv2.resize(border, (original.shape[1], original.shape[0]), interpolation=cv2.INTER_NEAREST)
        save(paths['protection'], original * (1 - full_border))
        overlay = rgb.copy()
        edge = cv2.morphologyEx((border * 255).astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)) > 0
        overlay[edge] = [1, .1, .7]
        overlay = overlay * (1 - metal[..., None] * .25) + np.array([0, .7, 1]) * metal[..., None] * .25
        save(REVIEW / f'{number}-boundary.png', overlay)
        records.append({'cardId': evidence['cardId'], 'tcglVariantId': evidence['tcglVariantId'],
                        'sourceEvidence': f'../tcgl/{number}-holo-evidence.json',
                        'frontDimensions': [w, h], 'frontSHA256': sha(front_path),
                        'originalProtectionSHA256': sha(protection_path),
                        'outputs': {key: {'file': path.name, 'sha256': sha(path), 'dimensions': list(Image.open(path).size)} for key, path in paths.items()}})
    (OUT / 'evidence.json').write_text(json.dumps({'method': 'Full-card UV, no crop/flip/offset. Transmission = .08 + .92 * sqrt(linear RGB luminance). Silver = existing TCGL opaque border connected component times smooth ink attenuation. Original interior protection preserved. No height/normal generation.',
        'limitations': 'Ink transmission is an estimate from clean RGB, not measured ink density. TCGL border connectivity reviewed in overlays; physical optical parameters remain appearance calibrated.',
        'cards': records}, indent=2) + '\n')

if __name__ == '__main__':
    main()
