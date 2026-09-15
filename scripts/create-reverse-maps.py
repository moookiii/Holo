"""Optical coverage only. The two source front images remain byte-for-byte unchanged."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from math import hypot

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'cards'
LINEAR = [(n/255/12.92 if n/255 <= .04045 else ((n/255+.055)/1.055)**2.4) for n in range(256)]

def svg(body):
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1650" viewBox="0 0 600 825">' + body + '</svg>'

eevee = ROOT / 'eevee-legendary-reverse'
# The gold artwork frame and caption are printed over the silver sheet.
eevee_shape = '<rect width="600" height="825" fill="white"/><rect x="55" y="86" width="492" height="351" fill="black"/>'
(eevee / 'reverse-foil.svg').write_text(svg(eevee_shape))
(eevee / 'laminate.svg').write_text(svg('<rect width="600" height="825" fill="#8c8c8c"/><rect x="55" y="86" width="492" height="351" fill="#777"/>'))

charizard = ROOT / 'charizard-expedition-reverse'
# Three individually registered red ink areas; not the inverse of a rectangular picture.
body = '<g fill="#e8e8e8"><path d="M140 19H581V35H184Z"/><path d="M166 42H581V87H157Q139 88 124 97Q151 73 166 42Z"/><path d="M63 382Q87 406 145 408H580V755H543L517 776H254L242 758H82Q63 755 63 733Z"/></g>'
# Yellow ribbons and symbols are opaque ink above the reflective body.
exclusions = '<g fill="black"><path d="M183 399H582V416H177L184 407H145Z"/><path d="M76 697H560V703H72Z"/><path d="M529 444Q570 438 562 459Q552 469 532 471Q556 460 548 449Z"/></g>'
(charizard / 'reverse-foil.svg').write_text(svg('<rect width="600" height="825" fill="black"/>' + body + exclusions))
(charizard / 'laminate.svg').write_text(svg('<rect width="600" height="825" fill="#777"/>' + body.replace('#e8e8e8', '#999')))

for name in ['eevee-legendary-reverse', 'charizard-expedition-reverse']:
    folder = ROOT / name
    front = Image.open(folder / 'front.png').convert('RGB')
    mask = Image.new('L', front.size, 0)
    pixels, out = front.load(), mask.load()
    # Local ink absorption: lettering stays dark while the foil remains visible
    # between letters. No opaque rectangular panel over the rules text.
    for y in range(front.height):
        for x in range(front.width):
            r, g, b = pixels[x, y]
            if name.startswith('eevee'):
                inside_body = (23 <= x < 578 and 22 <= y < 86) or (23 <= x < 578 and 437 <= y < 803)
                if inside_body:
                    lum = .2126*LINEAR[r] + .7152*LINEAR[g] + .0722*LINEAR[b]
                    # Separate black pigment from the measured paper reflectance.
                    # This alpha accompanies shader-side paper removal, preserving
                    # antialiased letters without introducing pale outlines.
                    ink = 1 - max(0, min(1, (lum-.012)/(.672-.012)))
                    # Red HP lettering is opaque too, despite its higher luminance.
                    if 406 <= x <= 503 and 44 <= y <= 83:
                        ink = max(ink, max(0, min(1, (r-g-30)/65)))
                    if 78 <= x <= 522 and 440 <= y <= 469:
                        # The gold ribbon has a photographed light fringe and
                        # drop shadow. Follow gold/black ink, not its bounding box.
                        gold = max(0, min(1, (min(r, g)-b-12)/34))
                        ink = max(ink, gold)
                    out[x, y] = round(255*ink)
            else:
                # Dark and blue text against warm red/orange ink: use the red
                # channel so dark red body shading is not mistaken for text.
                inside_body = (138 <= x < 582 and 18 <= y < 90) or (63 <= x < 582 and 417 <= y < 777)
                if inside_body:
                    out[x, y] = round(255 * max(0, min(1, (246-r)/38)))
    draw = ImageDraw.Draw(mask)
    if name.startswith('eevee'):
        # Register the printed medallions to subpixel edges. Integer oversized
        # circles protected surrounding paper and made obvious pale spots.
        for cx, cy, radius in [(526.5, 60.5, 20.7), (74, 529.5, 16.6), (54.5, 632, 17.1), (94.5, 632.5, 17.2), (91.5, 716.5, 15.1), (295.5, 716.5, 15.8), (499.5, 718, 15.1)]:
            for y in range(int(cy-radius-2), int(cy+radius+3)):
                for x in range(int(cx-radius-2), int(cx+radius+3)):
                    alpha = max(0, min(1, radius+.4-hypot(x+.5-cx, y+.5-cy)))
                    out[x, y] = max(out[x, y], round(255*alpha))
        # The set mark has a narrow white outline, never a white rectangle.
        symbol = Image.new('L', front.size, 0)
        sp = symbol.load()
        for y in range(441, 468):
            for x in range(536, 556):
                r, g, b = pixels[x, y]
                sp[x, y] = round(255*max(0, min(1, (130-min(r, g, b))/75)))
        outline = symbol.filter(ImageFilter.MaxFilter(3)).load()
        for y in range(440, 469):
            for x in range(535, 557):
                out[x, y] = max(out[x, y], outline[x, y])
    else:
        # Printed Energy medallions, weakness/retreat symbols and the set mark.
        for cx, cy, radius in [(98, 614, 19), (140, 614, 19), (98, 654, 19), (140, 654, 19), (107, 738, 18), (382, 737, 16), (416, 738, 16), (450, 738, 16), (551, 737, 17), (550, 64, 23)]:
            draw.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), fill=255)
        draw.rounded_rectangle((77, 443, 219, 471), radius=13, fill=255)
    mask.save(folder / 'protection.png')
    print(f'{name}: authored body coverage, ink protection and laminate')
