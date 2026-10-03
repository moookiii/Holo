"""Register a sourced product reference; do not manufacture missing packaging."""
from pathlib import Path
from PIL import Image
root = Path('public/packs/magic/alpha')
source = Image.open(root / 'reference.png').convert('RGB')
# Remove the white product-photo margin; retain the original printed seals.
source.crop((20, 15, 314, 541)).save(root / 'front.png')
Image.new('RGB', (294, 526), (193, 185, 172)).save(root / 'back.png')
# Zero authored metallic print mask. Wrapper film supplies the material lobe.
Image.new('L', (294, 526), 0).save(root / 'ink.png')
