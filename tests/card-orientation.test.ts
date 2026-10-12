import test from 'node:test';
import assert from 'node:assert/strict';
import { viewerCardRoll } from '../src/card/CardOrientation.ts';
import { tcglXySets } from '../src/pokemon/data/xy-tcgl.generated.ts';
import { celebrationRecords } from '../src/pokemon/data/30th.generated.ts';

test('every XY BREAK and sideways anniversary reprint opens clockwise', () => {
  const breaks = tcglXySets.flatMap(set => set.cards).filter(card => card.rarity === 'BREAK Rare');
  assert.ok(breaks.length > 0);
  for (const card of breaks) {
    assert.equal(viewerCardRoll({ franchise: 'Pokémon', title: card.name }), -Math.PI / 2, card.id);
  }
  for (const id of ['30th-classic-016', '30th-classic-017', '30th-classic-022']) {
    const card = celebrationRecords.find(card => card.id === id)!;
    assert.equal(viewerCardRoll({ franchise: 'Pokémon', title: card.name }), -Math.PI / 2, id);
  }
});

test('ordinary prints and other franchises keep their upright orientation', () => {
  for (const title of ['Exeggutor', 'ナッシー[Exeggutor]', 'Pikachu V-UNION', 'Alolan Exeggutor', 'Legendary Treasures']) {
    assert.equal(viewerCardRoll({ franchise: 'Pokémon', title }), 0);
  }
  assert.equal(viewerCardRoll({ franchise: 'Yu-Gi-Oh!', title: 'BREAK' }), 0);
  assert.equal(viewerCardRoll({ franchise: 'Magic: The Gathering', title: 'LEGEND' }), 0);
});
