"""Read-only asset audit. Recompute normals in memory; never write a site PNG."""
from pathlib import Path
import hashlib, json, shutil
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    source = json.loads((ROOT / 'research/tcgl/151-set/sources.json').read_text())
    cards = []
    for printing in source['printings']:
        if printing['rarity'] != 'Ultra Rare':
            continue
        number = printing['number']
        base = ROOT / 'public/cards/pokemon/151/tcgl'
        evidence = json.loads((base / f'{number}-holo-evidence.json').read_text())
        preserved = ROOT / 'research/tcgl' / printing['cardId']
        preserved.mkdir(exist_ok=True)
        for item in printing['sources'].values():
            path = ROOT / item['file']
            assert digest(path) == item['sha256']
            shutil.copyfile(path, preserved / path.name)
        (preserved / 'source.json').write_text(json.dumps(printing, indent=2) + '\n')
        raw = np.asarray(Image.open(ROOT / printing['sources']['etch']['file']).convert('RGBA'), np.float32) / 255
        size = (1800, 2475)
        height = cv2.resize(1 - raw[..., :3].mean(2), size, interpolation=cv2.INTER_LINEAR)
        alpha = cv2.resize(raw[..., 3], size, interpolation=cv2.INTER_LINEAR)
        protection = np.asarray(Image.open(base / f'{number}-holo-protection.png').convert('L'), np.float32) / 255
        nx = -cv2.Scharr(height, cv2.CV_32F, 1, 0, scale=1/32) * 1.03 * (1-protection)
        ny = cv2.Scharr(height, cv2.CV_32F, 0, 1, scale=1/32) * 1.03 * (1-protection)
        length = np.sqrt(nx*nx + ny*ny + 1)
        normal = np.stack((nx/length, ny/length, 1/length), axis=2)
        normal = normal*alpha[..., None] + np.array([0, 0, 1], np.float32)*(1-alpha[..., None])
        encoded = np.rint(np.clip(normal*.5+.5, 0, 1)*255).astype(np.uint8)
        stored = np.asarray(Image.open(base / f'{number}-holo-normal.png'))
        assert np.array_equal(encoded, stored), number
        assert np.all(stored[protection == 1] == [128, 128, 255]), number
        for name, expected in evidence['maps'].items():
            assert digest(base / name) == expected, name
        cards.append({'cardId': printing['cardId'], 'name': printing['name'], 'tcglCardId': printing['tcglCardId'],
            'tcglVariantId': printing['tcglVariantId'], 'foil': printing['foil'], 'sources': printing['sources'],
            'preservedDirectory': preserved.relative_to(ROOT).as_posix(),
            'alignmentReview': printing['alignmentReview'], 'dimensions': list(size),
            'normalRecomputedPixelExact': True, 'mapsUnchanged': evidence['maps']})
    output = {'exportUrl': source['exportUrl'], 'cards': cards,
        'method': 'Inverted mean RGB; full-domain bilinear resize; Scharr CV_32F scale 1/32; gain 1.03; protection after differentiation; normalize; alpha flatten; opaque RGB OpenGL +Y. No flip, crop, offset, noise, blur or runtime emboss.',
        'replacedAssets': [], 'reference': 'User-supplied 0000007982.mp4, Ultra Rare Zapdos 192 segment approximately 3-7 seconds.',
        'referenceSha256': digest(Path('C:/Users/jpall/Documents/ShareX/Screenshots/2026-10/0000007982.mp4'))}
    (ROOT / 'docs/151-ultra-evidence.json').write_text(json.dumps(output, indent=2) + '\n')
    print(f'{len(cards)} exact normals verified; all source and site asset hashes unchanged')

if __name__ == '__main__':
    main()
