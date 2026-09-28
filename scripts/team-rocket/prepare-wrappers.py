"""Trim empty transparent product-photo margins; preserve both printed crimps."""
from pathlib import Path
import json, hashlib
from PIL import Image

manifest_path = Path('scripts/team-rocket/wrapper-sources.json')
manifest = json.loads(manifest_path.read_text())
for item in manifest:
    if 'design' not in item:
        continue
    path = Path(item['file'])
    image = Image.open(Path('artifacts/team-rocket/wrapper-originals') / path.name)
    crop = image.getbbox()
    image = image.crop(crop)
    image.thumbnail((1000, 1400), Image.Resampling.LANCZOS)
    image.save(path, optimize=True)
    item['sourceSha256'] = item.get('sourceSha256', item['sha256'])
    item['crop'] = list(crop)
    item['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
