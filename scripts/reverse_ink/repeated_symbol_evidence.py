"""Expose alternate motif occurrences for the rejected Grass and Fire drafts.

These are unaltered photo crops, not reconstructed assets or replacement glyphs.
Coordinates refer to the existing 630 x 880 normalized card frame.
"""
import json
from PIL import Image, ImageDraw
from normalize import DATA

REGIONS = {
    'central': [402, 553, 90, 100],
    'upper-left': [35, 450, 90, 92],
    'lower-left': [75, 685, 145, 140],
}
FAMILIES = {'grass': ['bulbasaur', 'caterpie', 'oddish'],
            'fire': ['charmander', 'growlithe', 'vulpix']}


def main():
    destination = DATA / 'review/symbols/rejected-draft-evidence'
    destination.mkdir(parents=True, exist_ok=True)
    records = []
    for family, sources in FAMILIES.items():
        sheet = Image.new('RGB', (1080, 1200), '#202328')
        draw = ImageDraw.Draw(sheet)
        for row, source_id in enumerate(sources):
            source = Image.open(DATA / 'normalized' / f'{source_id}.png').convert('RGB')
            scale = source.width / 630
            for column, (occurrence, rectangle) in enumerate(REGIONS.items()):
                x, y, width, height = rectangle
                bounds = tuple(round(value * scale) for value in (x, y, x + width, y + height))
                crop = source.crop(bounds)
                # Uniform magnification within each tile; no contrast adjustment,
                # rotation, geometric fitting, or inferred hidden boundary.
                factor = min(350 / crop.width, 350 / crop.height)
                crop = crop.resize((round(crop.width * factor), round(crop.height * factor)), Image.Resampling.LANCZOS)
                sheet.paste(crop, (column * 360 + (360 - crop.width) // 2, row * 400 + 40))
                draw.text((column * 360 + 8, row * 400 + 8), f'{source_id} / {occurrence}', fill='white')
                records.append(dict(family=family, source=source_id, occurrence=occurrence,
                                    canonical_rectangle=rectangle, normalized_pixel_bounds=bounds))
        sheet.save(destination / f'{family}.png')
    (destination / 'regions.json').write_text(json.dumps({
        'status': 'evidence-only',
        'purpose': 'Review alternate occurrences before replacing user-rejected Fire and Grass contours.',
        'limitations': 'Lower-left occurrences cross printed dividers. Occurrences have different rotations and scales; they are not aligned glyph comparisons. Upsampling adds no detail.',
        'regions': records,
    }, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
