"""Rasterize the soft stack footprint used only on the binder lining."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).resolve().parents[1]
alpha = Image.new('L', (768, 792), 0)
ImageDraw.Draw(alpha).rounded_rectangle((22, 22, 746, 770), radius=14, fill=255)
alpha = alpha.filter(ImageFilter.GaussianBlur(12))
image = Image.new('RGBA', alpha.size, (48, 39, 24, 0))
image.putalpha(alpha)
image.save(root / 'public/binder/stack-contact-shadow.png')
