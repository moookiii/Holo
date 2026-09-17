"""Extract title lettering from clean YGOPRODeck fronts for Ultra Rare maps."""
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "public/cards/holo-bulk/yugioh"
OUTPUT = CARDS / "maps"
OUTPUT.mkdir(parents=True, exist_ok=True)

LIGHT_TITLES = {
    "forbidden-droplet", "triple-tactics-talent", "pot-of-prosperity",
    "called-by-the-grave", "lightning-storm", "evenly-matched", "dark-ruler-no-more",
}

def remove_specks(mask: np.ndarray, minimum: int = 9) -> np.ndarray:
    kept = np.zeros_like(mask)
    seen = np.zeros_like(mask, dtype=bool)
    height, width = mask.shape
    for y, x in zip(*np.nonzero(mask & ~seen)):
        if seen[y, x]:
            continue
        queue = deque([(y, x)]); seen[y, x] = True; component = []
        while queue:
            cy, cx = queue.popleft(); component.append((cy, cx))
            for ny, nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                if 0 <= ny < height and 0 <= nx < width and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; queue.append((ny, nx))
        if len(component) >= minimum:
            for cy, cx in component: kept[cy, cx] = True
    return kept

for front in sorted(CARDS.glob("*.jpg")):
    slug = front.stem
    rgb = np.asarray(Image.open(front).convert("RGB"))
    region = rgb[48:134, 48:680]
    if slug in LIGHT_TITLES:
        selected = region.min(axis=2) > 180
    else:
        selected = region.max(axis=2) < 78
    selected = remove_specks(selected)
    mask = np.zeros((1185, 813), dtype=np.uint8)
    mask[48:134, 48:680] = selected * 255
    Image.fromarray(mask).save(OUTPUT / f"{slug}-name.png")
    height = np.full((1185, 813), 128, dtype=np.uint8)
    height[mask > 0] = 104
    Image.fromarray(height).save(OUTPUT / f"{slug}-height.png")
