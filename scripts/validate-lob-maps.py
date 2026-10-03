"""Asset-level assertions complement TypeScript profile/collation tests."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
cards=root/'public/cards/yugioh/lob-first-edition'
rows=json.loads((root/'src/yugioh/sets/lob-data.json').read_text())
for card in rows:
    number=card['number']; size=Image.open(root/('public'+card['front'])).size
    foil=np.array(Image.open(cards/'maps'/f'{number}-foil.png'))
    name=np.array(Image.open(cards/'maps'/f'{number}-name.png'))
    stamp=np.array(Image.open(cards/'maps'/f'{number}-stamp.png'))
    assert foil.shape==(size[1],size[0]), number
    assert bool(np.any(foil))==(card['rarity'] not in ('Common','Rare')), number
    assert bool(np.any(name))==(card['rarity'] not in ('Common','Super Rare')), number
    assert not np.any((foil>0)&(name>0)), number
    assert not np.any((stamp>0)&((foil>0)|(name>0))), number
    assert np.any(stamp),number
    assert np.count_nonzero(name)/(size[0]*size[1])<.035,number
    assert not np.any(name[int(size[1]*.15):]),number
print('126 card PNG registrations, rarity coverage, title/art/stamp separation passed')
print('Card assets MiB:',round(sum(p.stat().st_size for p in cards.rglob('*') if p.is_file())/1048576,2))
print('Wrapper MiB:',round(sum(p.stat().st_size for p in (root/'public/packs/yugioh/lob-first-edition').glob('*'))/1048576,2))
