import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { holoBulkCards } from '../src/card/HoloBulkCards.ts';
import { nonHoloCards } from '../src/card/NonHoloCards.ts';

test('bulk holo library contains 24 genuinely new card names', () => {
  assert.equal(holoBulkCards.length, 24);
  const existing = new Set(nonHoloCards.map(card => card.title.toLocaleLowerCase()));
  const added = new Set<string>();
  for (const card of holoBulkCards) {
    const title = card.title.toLocaleLowerCase();
    assert.ok(!existing.has(title), `${card.title} already exists in the non-holo library`);
    assert.ok(!added.has(title), `${card.title} is duplicated in the bulk batch`);
    added.add(title);
  }
});

test('each game uses only its historically matched existing profile', () => {
  const expected = new Map([
    ['Pokémon', 'pokemon-e-reader'], ['Yu-Gi-Oh!', 'ygo-super'], ['Magic: The Gathering', 'mtg-traditional'],
  ]);
  const counts = Map.groupBy(holoBulkCards, card => card.franchise);
  assert.equal(counts.get('Pokémon')?.length, 6);
  assert.equal(counts.get('Yu-Gi-Oh!')?.length, 1);
  assert.equal(counts.get('Magic: The Gathering')?.length, 17);
  for (const card of holoBulkCards) assert.equal(card.profile, expected.get(card.franchise));
});

test('fronts, shared maps, and online evidence are present', () => {
  for (const card of holoBulkCards) {
    assert.ok(existsSync(`public${card.front}`), `missing ${card.front}`);
    for (const map of Object.values(card.maps ?? {})) {
      assert.ok(existsSync(`public${map.split('?')[0]}`), `missing ${map}`);
    }
    assert.match(card.source?.image ?? '', /^https:\/\//);
    assert.match(card.source?.metadata ?? '', /^https:\/\//);
  }
});

test('Expedition cards explicitly select authored reverse coverage', () => {
  for (const card of holoBulkCards.filter(card => card.franchise === 'Pokémon')) {
    assert.equal(card.coverageMode, 'reverse');
    assert.ok(card.maps?.reverseFoil?.includes('pokemon-ereader-trainer'));
  }
});
