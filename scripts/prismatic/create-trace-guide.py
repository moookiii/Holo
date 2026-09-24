"""Rasterize finite research traces for photo review, never renderer relief.

This intentionally exports only a transparent colored inspection guide. The
audited etched_maps compiler remains the only path to height/normal export.
"""
from pathlib import Path
import hashlib
import json
import math
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
RESEARCH = ROOT / 'research/prismatic-evolutions'
SOURCE = RESEARCH / 'traces/133-holo-draft.json'
SCALE = 8


def create_guide():
    spec = json.loads(SOURCE.read_text())
    assert spec['cardId'] == 'sv08.5-133' and spec['variant'] == 'holo'
    assert spec['status'] == 'draft-observations' and spec['lineworkReviewed'] is False
    assert spec['coordinates'] == [600, 825]
    references = {photo['photo']: photo for photo in spec['evidence']}
    for name, photo in references.items():
        path = (RESEARCH / 'photos' / name).resolve()
        assert path.parent == (RESEARCH / 'photos').resolve()
        assert hashlib.sha256(path.read_bytes()).hexdigest() == photo['sha256']
    guide = Image.new('RGBA', (600*SCALE, 825*SCALE))
    draw = ImageDraw.Draw(guide)
    count = 0
    ids = set()
    for region in spec['regions']:
        x0, y0, x1, y1 = region['bounds']
        for line in region['lines']:
            assert line['id'] not in ids
            ids.add(line['id'])
            assert line['status'] == 'needs-cross-photo-review'
            assert line['photo'] in references
            points = line['points']
            assert len(points) >= 2
            assert all(len(p) == 2 and all(math.isfinite(v) for v in p)
                       and x0 <= p[0] <= x1 and y0 <= p[1] <= y1 for p in points)
            assert all(a != b for a, b in zip(points, points[1:]))
            # Straight segments connect only explicit observations. No repeated
            # lines, interpolation through hidden areas, or relief inference.
            xy = [(round(x*SCALE), round(y*SCALE)) for x, y in points]
            draw.line(xy, fill=(81, 226, 240, 235), width=3, joint='curve')
            for x, y in (xy[0], xy[-1]):
                draw.ellipse((x-4, y-4, x+4, y+4), fill=(255, 231, 142, 255))
            count += 1
    destination = SOURCE.with_name('133-holo-guide.png')
    guide.resize((1200, 1650), Image.Resampling.LANCZOS).save(destination, optimize=True)
    print(f'Atticus: {count} draft ridge segments; PNG inspection guide only')


if __name__ == '__main__':
    create_guide()
