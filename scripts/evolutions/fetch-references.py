"""Preserve exact-print physical photos used for manual motif registration."""
from pathlib import Path
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'research/evolutions'
# Search-discovered primary seller photographs, not replacement printed fronts.
REFERENCES = [
    (11, 'Charizard', 'https://www.ebay.com/itm/267443280949', 'https://i.ebayimg.com/images/g/YmoAAeSwtgxo9owa/s-l1200.jpg'),
    (15, 'Ninetales', 'https://www.ebay.com/itm/134659444414', 'https://i.ebayimg.com/images/g/uBoAAOSw6NhksNEk/s-l1200.jpg'),
    (25, 'Poliwrath', 'https://www.ebay.com/itm/265294961362', 'https://i.ebayimg.com/00/s/MTYwMFgxMjAw/z/5oUAAOSwhIFhL~Tt/%24_57.JPG?set_id=8800005007'),
    (34, 'Gyarados', 'https://www.ebay.com/itm/135586364427', 'https://i.ebayimg.com/images/g/as4AAeSw7vJnwTCi/s-l1600.jpg'),
    (36, 'Raichu', 'https://www.ebay.com/itm/197982818780', 'https://i.ebayimg.com/images/g/ybEAAOSwQGdn0Zse/s-l1200.png'),
    (38, 'Magneton', 'https://www.ebay.com/itm/304465820652', 'https://i.ebayimg.com/images/g/P6kAAOSwfnhiazXi/s-l1200.jpg'),
    (42, 'Zapdos', 'https://www.ebay.co.uk/itm/264995091846', 'https://i.ebayimg.com/images/g/ScoAAOSwL5xf7JRE/s-l1200.jpg'),
    (45, 'Nidoking', 'https://www.ebay.com/itm/124434657089', 'https://i.ebayimg.com/images/g/j9MAAOSwAp1fq5jU/s-l1200.jpg'),
    (53, 'Mew', 'https://www.ebay.com/itm/365757087211', 'https://i.ebayimg.com/images/g/K-EAAeSwLj9ogou5/s-l1600.jpg'),
    (59, 'Machamp', 'https://www.ebay.com/itm/403884561581', 'https://i.ebayimg.com/images/g/-l0AAOSwF59jIQOE/s-l1200.jpg'),
    (62, 'Hitmonchan', 'https://www.ebay.fr/itm/266376343970', 'https://i.ebayimg.com/images/g/RVAAAOSwZIlk3dcs/s-l1200.jpg'),
    (63, 'Clefairy', 'https://www.ebay.com/itm/373982067455', 'https://i.ebayimg.com/images/g/DtgAAOSw2R5iNAxn/s-l1200.jpg'),
    (70, 'Chansey', 'https://www.ebay.com/itm/374418448000', 'https://i.ebayimg.com/00/s/MTYwMFgxNTk4/z/U9sAAOSwg19jfrMy/%24_57.JPG?set_id=8800005007'),
]

def fetch(row):
    number, name, page, url = row
    folder = OUT / f'xy12-{number}'
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / 'physical.jpg'
    if not path.exists():
        response = requests.get(url, timeout=45)
        response.raise_for_status()
        path.write_bytes(response.content)
    return {'cardId': f'xy12-{number}', 'name': name, 'page': page, 'url': url,
            'file': path.relative_to(ROOT).as_posix(), 'dimensions': list(Image.open(path).size),
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'limitations': 'One seller photo of the exact English printing; copy-specific placements, no measured angular response or unseen motif inference.'}

if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=4) as pool:
        records = list(pool.map(fetch, REFERENCES))
    (OUT / 'references.json').write_text(json.dumps(records, indent=2) + '\n')
    print(json.dumps([{k:r[k] for k in ('cardId','dimensions')} for r in records]))
