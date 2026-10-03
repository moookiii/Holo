"""Source-coordinate ink mask; original scans are never modified.

All bright non-red, non-black print inside the label is selected. The clear
hub and outer silver lip remain physical plastic, outside the ink treatment.
The front scan cannot establish ink composition; coverage is a visual estimate.
"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
folder = root / 'public/artifacts/melee'
source = Image.open(folder / 'front.png').convert('RGB')
mask = Image.new('L', source.size)
for y in range(source.height):
    for x in range(source.width):
        radius2=(x-618)**2+(y-628)**2
        # Printed annulus only: preserve the clear center and exposed outer lip.
        if radius2 < 195**2 or radius2 > 575**2:
            continue
        r,g,b = source.getpixel((x,y))
        # Red print has a strong R lead; black print is too dark to be metallic.
        red_ink = max(0, min(1, (r-max(g,b)-34)/55))
        level = max(0, min(1, (min(r,g,b)-35)/105))*(1-red_ink)
        mask.putpixel((x,y), round(255*level))
mask.save(folder / 'metallic-ink.png')
review = root / 'artifacts/melee-review'
review.mkdir(parents=True, exist_ok=True)
Image.composite(Image.new('RGB',source.size,'#00bfff'),source,mask.point(lambda p:round(p*.65))).save(review/'mask-overlay.png')
