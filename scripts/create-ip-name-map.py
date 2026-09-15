"""Registered optical data from the white name ink; the front scan is unmodified."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1] / 'public/cards/ip-masquerena'
front = Image.open(root / 'front.png').convert('RGB')
mask = Image.new('L', front.size)
for y in range(39, 75):
    for x in range(36, 321):
        r, g, b = front.getpixel((x, y))
        # Bright neutral letter strokes on the blue name panel, with antialiased edges.
        white = min(r, g, b)
        mask.putpixel((x, y), round(max(0, min(1, (white - 140) / 65)) * 255))
mask.save(root / 'name.png')
