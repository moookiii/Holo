"""Register the user cutout to the untouched square print; output only PNG maps."""
from pathlib import Path
import json
import shutil
import numpy as np
from PIL import Image, ImageChops, ImageFilter

root = Path(__file__).resolve().parents[1] / 'public/cards/micae'
root.mkdir(parents=True, exist_ok=True)
shutil.copyfile(Path('C:/Users/jpall/Pictures/Micaeoriginal.png'), root / 'front.png')
shutil.copyfile(Path('C:/Users/jpall/Desktop/micaemask.png'), root / 'user-protection.png')
front = Image.open(root / 'front.png').convert('RGB')
protection = Image.open(root / 'user-protection.png').convert('L').resize(front.size, Image.Resampling.LANCZOS)
# The title's neutral silver glyphs are distinct from the saturated background.
# Classify by chroma as well as value, preserving counters and spaces between letters.
a = np.asarray(front).astype(float)
hi, lo = a.max(axis=2), a.min(axis=2)
glyphs = np.clip((lo - 65) / 70, 0, 1) * np.clip((35 - (hi - lo)) / 15, 0, 1)
roi = np.zeros(hi.shape); roi[23:69, 710:1004] = 1
text = Image.fromarray(np.uint8(glyphs * roi * 255)).filter(ImageFilter.MaxFilter(3))
protection = ImageChops.lighter(protection, text)
protection.save(root / 'protection.png')
# Keep full foil coverage separate: protection is applied once by the map packer.
Image.new('L', front.size, 255).save(root / 'foil.png')
edge = ImageChops.subtract(protection.filter(ImageFilter.MaxFilter(3)), protection.filter(ImageFilter.MinFilter(3)))
Image.composite(Image.new('RGB', front.size, '#ff4070'), front, edge).save(root / 'boundary-review.png')
(root / 'source.json').write_text(json.dumps({
    'artwork': 'User-supplied Micaeoriginal.png, unchanged',
    'cutout': 'User-supplied micaemask.png; white protects print, black admits foil',
    'registration': '1181 x 1182 cutout normalized to the 1024 x 1024 source coordinate system',
    'title': 'Neutral silver letter shapes added to protection; no rectangular row mask',
    'finish': 'Sapphire Blue; original optical design, no relief inferred from print brightness'
}, indent=2) + '\n')
