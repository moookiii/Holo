"""Prepare exact-front title and conservative relief maps; optical pattern design remains separate."""
from collections import deque
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "public/cards/yugioh-top-holos"
OUTPUT = CARDS / "maps"
OUTPUT.mkdir(parents=True, exist_ok=True)
CARD_TYPES = {card["slug"]: card["cardType"] for card in json.loads((CARDS / "sources.json").read_text())}

def remove_specks(mask: np.ndarray, minimum: int = 8) -> np.ndarray:
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
    rgb = np.asarray(Image.open(front).convert("RGB"))
    # Stop before the attribute badge; long names still end left of x=680.
    region = rgb[48:134, 48:680]
    dark = remove_specks(region.max(axis=2) < 82)
    light = remove_specks(region.min(axis=2) > 178)
    # Konami's standard frame uses light title ink for Spell/Trap cards and dark ink for monsters.
    card_type = CARD_TYPES[front.stem]
    selected = light if card_type in ("Spell Card", "Trap Card") or "Link" in card_type or "XYZ" in card_type else dark
    mask = np.zeros((1185, 813), dtype=np.uint8)
    mask[48:134, 48:680] = selected * 255
    Image.fromarray(mask).save(OUTPUT / f"{front.stem}-name.png", optimize=True)
    height = np.full((1185, 813), 128, dtype=np.uint8)
    height[mask > 0] = 104
    Image.fromarray(height).save(OUTPUT / f"{front.stem}-height.png", optimize=True)
