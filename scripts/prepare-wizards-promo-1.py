"""Rectify a photographed, unstamped Wizards Promo #1 into the local card front."""
from pathlib import Path
from urllib.request import urlopen

import cv2
import numpy as np


SOURCE = "https://www.wildcardcyclone.com/cdn/shop/products/Pikachu1BasicPokemonBlackStarPromo_800x.jpg?v=1606705896"
OUTPUT = Path(__file__).resolve().parents[1] / "public/cards/pokemon/wizards-promos/1.png"

photograph = cv2.imdecode(np.frombuffer(urlopen(SOURCE, timeout=30).read(), np.uint8), cv2.IMREAD_COLOR)
if photograph is None or photograph.shape[:2] != (1067, 800):
    raise RuntimeError("The ordinary promo #1 source photograph changed; review its crop before updating.")

# Physical outer card corners in the source photo, kept inside the fabric background.
corners = np.float32([[79, 75], [731, 75], [742, 994], [70, 994]])
target = np.float32([[0, 0], [599, 0], [599, 824], [0, 824]])
front = cv2.warpPerspective(photograph, cv2.getPerspectiveTransform(corners, target), (600, 825), flags=cv2.INTER_CUBIC)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
if not cv2.imwrite(str(OUTPUT), front):
    raise RuntimeError(f"Could not save {OUTPUT}")
