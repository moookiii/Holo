from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1] / 'public/cards/tyranitar-paldea-evolved'
front = Image.open(root / 'front.png').convert('RGB')
protection = Image.new('L', front.size)
# The copyright is printed directly on silver foil. Protect the actual letter
# shapes; a rectangular exclusion creates a visibly pasted-on footer strip.
for y in range(995, 1018):
    for x in range(130, 615):
        brightness = sum(front.getpixel((x, y))) / 3
        protection.putpixel((x, y), round(max(0, min(1, (165 - brightness) / 85)) * 255))
protection.save(root / 'protection.png')
