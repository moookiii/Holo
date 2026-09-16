"""Build registered material layers from the hand-authored coverage and print.

Requires Pillow. Run from any directory with Python. front.jpg and coverage.png
are source assets, never outputs: rebuilding must retain the finished silhouette
and all individually masked motes. The generated maps describe a viewer study,
not measured relief or proof of a particular physical printing.
"""
from pathlib import Path
from math import sqrt
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / 'public/cards/dark-magician-girl'
front = Image.open(ROOT / 'front.jpg').convert('RGB')
coverage = Image.open(ROOT / 'coverage.png').convert('RGB').getchannel('R')
assert front.size == coverage.size == (549, 800)
SIZE = front.size
ART = (67, 147, 483, 564)


def smooth(a, b, x):
    t = max(0, min(1, (x-a)/(b-a)))
    return t*t*(3-2*t)


def byte(x):
    return round(max(0, min(255, x)))


def gray(value=0):
    return Image.new('L', SIZE, value)


# Connected opaque character, excluding isolated white motes. Use the authored
# mask rather than re-tracing a coarser polygon or classifying colored ink.
component = coverage.crop(ART).point(lambda v: 255 if v < 128 else 0)
ImageDraw.floodfill(component, (270-ART[0], 300-ART[1]), 128)
subject = gray()
subject.paste(component.point(lambda v: 255 if v == 128 else 0), ART[:2])
subject = subject.filter(ImageFilter.GaussianBlur(.7))
form = subject.filter(ImageFilter.GaussianBlur(5))
ink_detail = front.convert('L').filter(ImageFilter.GaussianBlur(1.6))

height, roughness, sparkle = gray(128), gray(128), gray()
laminate, extended, name, pattern = gray(86), gray(), gray(), gray()
hologram = Image.new('RGB', SIZE, (128, 0, 128))

for y in range(SIZE[1]):
    for x in range(SIZE[0]):
        r, g, b = front.getpixel((x, y))
        title = 42 <= x <= 433 and 48 <= y <= 84
        if title:
            name.putpixel((x, y), byte(255*(1-smooth(55, 115, max(r, g, b)))))

        in_art = ART[0] <= x < ART[2] and ART[1] <= y < ART[3]
        if in_art:
            foil = coverage.getpixel((x, y))/255
            figure = subject.getpixel((x, y))/255
            rounded = form.getpixel((x, y))/255
            detail = ink_detail.getpixel((x, y))/255
            # The magic circle is a shallow embossed plane behind the figure.
            # Eased edges keep this from becoming a glowing ring.
            radius = sqrt(((x-280)/187)**2 + ((y-357)/203)**2)
            ring = smooth(.66, .70, radius)*(1-smooth(.96, 1, radius))
            height.putpixel((x, y), byte(128 + 37*rounded + 14*figure + 8*figure*detail + 9*ring*(1-figure)))
            # Offset around 128 preserves each selected profile's calibration.
            roughness.putpixel((x, y), byte(128 - 12*foil + 14*figure))
            sparkle.putpixel((x, y), byte(208*foil))
            laminate.putpixel((x, y), byte(170 + 36*figure))
            pattern.putpixel((x, y), byte(255*foil))
            # Ghost includes the opaque character ink in its virtual image.
            edge = min(x-ART[0], ART[2]-1-x, y-ART[1], ART[3]-1-y)
            hologram.putpixel((x, y), (byte(70 + 118*rounded + 22*figure*detail + 12*ring*(1-figure)),
                                      byte(255*smooth(0, 2, edge)),
                                      byte(106 + 39*rounded + 9*ring)))
        elif 22 <= x < 528 and 22 <= y < 778:
            # Authored parallel-frame area. Rules, title ink, attribute/level
            # icons, serials and security mark remain independent regions.
            rules = 31 <= x <= 518 and 591 <= y <= 760
            # The Dark attribute orb and level stars are part of the foil
            # treatment like the surrounding name panel.
            icons = False
            # The bottom serial/edition line remains printed; the LED6-EN000
            # set code above the rules box receives the surrounding foil.
            identifiers = y >= 757
            picture_bevel = 56 <= x <= 493 and 137 <= y <= 574
            if not (rules or icons or identifiers or picture_bevel):
                extended.putpixel((x, y), 176)
                pattern.putpixel((x, y), 255)
                sparkle.putpixel((x, y), 148)
            if rules:
                laminate.putpixel((x, y), 58)

# Smooth optical transitions without dilating the authored foil boundary.
height = height.filter(ImageFilter.GaussianBlur(.6))
roughness = roughness.filter(ImageFilter.GaussianBlur(.6))
laminate = laminate.filter(ImageFilter.GaussianBlur(.5))
# Artwork-only sparkle must not accidentally switch off the security stamp.
stamp = gray()
ImageDraw.Draw(stamp).rounded_rectangle((505, 751, 529, 778), radius=1, fill=255)
sparkle = ImageChops.lighter(sparkle, ImageChops.lighter(name, stamp))
extended = ImageChops.multiply(extended, ImageChops.invert(name))
surface = Image.merge('RGB', (height, roughness, sparkle))

for filename, data in {
    'name.png': name, 'height.png': height, 'roughness.png': roughness,
    'sparkle.png': sparkle, 'surface.png': surface, 'laminate.png': laminate,
    'extended-foil.png': extended, 'pattern.png': pattern, 'hologram.png': hologram,
}.items():
    data.save(ROOT / filename)

# Keep a labeled proof sheet outside the shipping assets for visual inspection.
proof_dir = ROOT.parents[2] / 'artifacts/dmg-layers'
proof_dir.mkdir(parents=True, exist_ok=True)
tiles = [('PRINT', front), ('COVERAGE (SOURCE)', coverage), ('NAME / SECONDARY', name),
         ('HEIGHT', height), ('ROUGHNESS (OFFSET)', roughness), ('SPARKLE', sparkle),
         ('LAMINATE', laminate), ('EXTENDED FOIL', extended), ('HOLOGRAM (DEPTH / WINDOW / ANGLE)', hologram)]
proof = Image.new('RGB', (3*300, 3*462), '#17191d')
draw = ImageDraw.Draw(proof)
for i, (label, data) in enumerate(tiles):
    left, top = (i % 3)*300, (i // 3)*462
    draw.text((left+12, top+9), label, fill='#eef1f5')
    proof.paste(data.convert('RGB').resize((280, 408), Image.Resampling.LANCZOS), (left+10, top+33))
proof.save(proof_dir / 'layers.png')
print('Generated 9 registered material maps; front.jpg and coverage.png retained.')
