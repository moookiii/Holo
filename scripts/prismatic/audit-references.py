"""Inventory exact-printing photo evidence without inventing missing relief.

Run after inspecting/annotating references.json. Source images stay unchanged.
The generated inventory is a research checklist, never renderer-ready data.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RESEARCH = ROOT / 'research/prismatic-evolutions'
references = json.loads((RESEARCH / 'references.json').read_text(encoding='utf-8'))
catalog = json.loads((ROOT / 'public/cards/pokemon/prismatic-evolutions/catalog.json').read_text(encoding='utf-8'))
cards = {card['id']: card for card in catalog['cards']}
photos = []
for entry in references['photos']:
    assert entry['cardId'] in cards, entry['cardId']
    path = RESEARCH / 'photos' / entry['file']
    assert path.resolve().parent == (RESEARCH / 'photos').resolve()
    data = path.read_bytes()
    with Image.open(path) as image:
        dimensions = list(image.size)
    photos.append({**entry, 'listingUrl': f"https://www.ebay.com/itm/{entry['listing']}",
        'imageUrl': f"https://i.ebayimg.com/images/g/{entry['imageKey']}/s-l1600.webp",
        'dimensions': dimensions, 'sha256': hashlib.sha256(data).hexdigest()})

inventory = []
for card in cards.values():
    rarity = card['rarity'].lower()
    textured = []
    if rarity in ('common', 'uncommon', 'rare'):
        textured.append('pokeball-reverse')
        if card['category'] == 'Pokemon':
            textured.append('masterball-reverse')
    elif rarity in ('ultra rare', 'special illustration rare', 'hyper rare'):
        textured.append('holo')
    for variant in textured:
        matching = [photo for photo in photos if photo['cardId'] == card['id'] and photo['variant'] == variant]
        review = next((review for review in references['printingReviews'] if review['cardId'] == card['id'] and review['variant'] == variant), None)
        inventory.append({'cardId': card['id'], 'name': card['name'], 'variant': variant,
            'photos': [photo['file'] for photo in matching],
            'usablePartialPhotos': sum(photo['assessment'] == 'partial-surface' for photo in matching),
            'evidenceComplete': bool(review and review['evidenceComplete']),
            'remaining': review['remaining'] if review else 'Exact-printing directional photographs have not yet been collected and reviewed.'})
assert len(inventory) == 216
assert len({photo['file'] for photo in photos}) == len(photos)
untracked = {p.name for p in (RESEARCH / 'photos').glob('*.webp')} - {photo['file'] for photo in photos}
assert not untracked, f'Photos without provenance: {untracked}'
(RESEARCH / 'audit.json').write_text(json.dumps({'inspectedOn': references['inspectedOn'],
    'photos': photos, 'texturedPrintings': inventory}, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'{len(photos)} inspected images; {len(references["printingReviews"])} printing reviews; '
      f'{sum(entry["evidenceComplete"] for entry in inventory)}/216 evidence-complete textured printings.')
