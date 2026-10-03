"""Source-coordinate ink mask; original scans are never modified.

Only the colored/silver ink inside identified printed emblems is selected.
White plastic, red ink, black letter interiors and gaps remain unselected.
The front scan cannot establish ink composition; coverage is a visual estimate.
"""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
folder = root / 'public/artifacts/melee'
source = Image.open(folder / 'front.png').convert('RGB')
regions = Image.new('L', source.size)
draw = ImageDraw.Draw(regions)
# Title, Melee wordmark, seal, GameCube, rating, and manufacturing inscriptions.
for box in [(216,130,1015,345),(470,367,808,417),(133,809,353,975),
            (378,830,878,947),(909,782,1047,987),(286,1020,953,1200)]:
    draw.rectangle(box, fill=255)
mask = Image.new('L', source.size)
for y in range(source.height):
    for x in range(source.width):
        if not regions.getpixel((x,y)) or (x-618)**2+(y-628)**2 > 587**2:
            continue
        r,g,b = source.getpixel((x,y))
        # Antialias coverage follows ink pixels, never the rectangular ROI.
        level = max(0, min(1, (min(r,g,b)-35)/105))
        mask.putpixel((x,y), round(255*level))
mask.save(folder / 'metallic-ink.png')
review = root / 'artifacts/melee-review'
review.mkdir(parents=True, exist_ok=True)
Image.composite(Image.new('RGB',source.size,'#00bfff'),source,mask.point(lambda p:round(p*.65))).save(review/'mask-overlay.png')
