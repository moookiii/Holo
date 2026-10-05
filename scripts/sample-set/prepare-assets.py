"""Retain native exact-card scans; no reconstruction, resizing or front cropping."""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

source = Path('research/sample-set')
target = Path('public/cards/pokemon/sample-set')
target.mkdir(parents=True, exist_ok=True)
records = json.loads((source / 'candidates.json').read_text(encoding='utf-8'))
manifest = []
for card in records:
    original = source / f"{card['number']}-pokumon.jpg"
    image = Image.open(original)
    destination = target / f"{card['number']}.jpg"
    shutil.copyfile(original, destination)
    manifest.append({
        'number': card['number'] + '/093', 'name': card['name'],
        'file': destination.name, 'url': card['alternate'], 'metadata': card['evidencePage'],
        'width': image.width, 'height': image.height,
        'sha256': hashlib.sha256(original.read_bytes()).hexdigest(),
        'finish': 'non-holo', 'category': 'Pokemon',
        'transformations': 'None. Native JPEG bytes; no crop, rotation, resize or enhancement.',
        'printingChecks': ['English name and alternate translation', 'Sample mark', 'M-prefix e-Reader identifier', 'correct three-digit /093 number', 'full left and bottom dot-code strips', 'copyright and illustrator text'],
        'quality': 'Modest-resolution scan. Fine edge data is visible but not production-quality at high zoom.',
        'alternateConsidered': { 'url': card['url'], 'width': card['width'], 'height': card['height'], 'reasonRejected': 'Larger but visibly softer photograph and less square registration.' },
    })
(target / 'sources.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
shutil.copyfile(source / 'tcgdex.json', target / 'tcgdex-set.json')
shutil.copyfile(source / 'symbol.png', target / 'symbol.png')
# A photographed example of the correct shared Japanese design, not a claimed
# back scan of any particular Sample card. Preserve original pixels losslessly.
back = Image.open(source / 'thumbnail_Image-2.jpg').convert('RGB')
back.save(target / 'back-jp.png')
support = {
    'back': {
        'url': 'https://sleevenocardbehind.com/wp-content/uploads/2022/04/thumbnail_Image-2.jpg',
        'page': 'https://sleevenocardbehind.com/when-did-japanese-pokemon-card-backs-change/',
        'file': 'back-jp.png', 'width': back.width, 'height': back.height,
        'sourceSha256': hashlib.sha256((source / 'thumbnail_Image-2.jpg').read_bytes()).hexdigest(),
        'sha256': hashlib.sha256((target / 'back-jp.png').read_bytes()).hexdigest(),
        'transformations': 'Lossless RGB PNG encoding; no retouching. Runtime backCrop [27/925,24/1280,910/925,1255/1280] excludes photographic surroundings only.',
        'limitation': 'Correct shared new Japanese design; photographed stock exemplar, not an exact Sample-card reverse scan. Baked lighting remains.',
    },
    'symbol': {
        'url': 'https://www.pokepedia.fr/images/7/71/Symbole_Sample_Set_JCC.png',
        'file': 'symbol.png', 'sha256': hashlib.sha256((target / 'symbol.png').read_bytes()).hexdigest(),
        'transformations': 'None. Printed Sample symbol; no separate official set logo or product wrapper established.',
    },
    'rejectedCatalog': 'https://shinybinder.co/cards/hoppip-sample-set-002-lg.webp is Expedition 112/165 with B-02 identifier, despite its Sample filename. Not used.',
    'distribution': {'event': 'Pokémon Center New York press conference', 'date': '2002-08', 'conventionalBooster': False, 'sealedTenCardPackage': 'Not established', 'participantAllocation': 'Unknown', 'holoCount': 0, 'trainerCount': 0, 'energyCount': 0},
}
(target / 'evidence.json').write_text(json.dumps(support, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
