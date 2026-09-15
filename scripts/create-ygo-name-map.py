"""Extract a registered lettering data mask; the card front remains unmodified."""
from pathlib import Path
from PIL import Image, ImageFilter

card = Path(__file__).resolve().parents[1] / 'public/cards/effect-veiler-ra01'
scan = Image.open(card / 'front.png').convert('L').resize((500, 730), Image.Resampling.LANCZOS)
background = scan.filter(ImageFilter.GaussianBlur(3))
mask = Image.new('L', scan.size)
for y in range(30, 72):
    for x in range(12, 370):
        # The photographed name panel is itself dark; absolute luminance selects
        # its entire rectangle. Extract ink relative to its local paper instead.
        contrast = background.getpixel((x, y)) - scan.getpixel((x, y))
        mask.putpixel((x, y), round(max(0, min(1, (contrast - 5) / 28)) * 255))
# A subpixel close joins interruptions in the foil without filling letter counters.
mask = mask.resize((1000, 1460), Image.Resampling.BICUBIC)
mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
mask.save(card / 'name.png')
