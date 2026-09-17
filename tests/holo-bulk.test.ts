import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { holoBulkCards, holoBulkCardIds } from '../src/card/HoloBulkCards.ts';
import { nonHoloCards } from '../src/card/NonHoloCards.ts';
import { holographicCardIds } from '../src/pack/PackDefinition.ts';

test('bulk holo library contains 44 genuinely new card names', () => {
  assert.equal(holoBulkCards.length, 44);
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
    ['Pokémon', 'pokemon-e-reader'], ['Yu-Gi-Oh!', 'ygo-ultra'], ['Magic: The Gathering', 'mtg-traditional'],
  ]);
  const counts = Map.groupBy(holoBulkCards, card => card.franchise);
  assert.equal(counts.get('Pokémon')?.length, 6);
  assert.equal(counts.get('Yu-Gi-Oh!')?.length, 21);
  assert.equal(counts.get('Magic: The Gathering')?.length, 17);
  for (const card of holoBulkCards) assert.equal(card.profile, expected.get(card.franchise));
});

test('Yu-Gi-Oh fronts are full 813 × 1185 cards and use the bounded artwork mask', () => {
  const jpegSize = (path: string) => {
    const bytes = readFileSync(path); let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      const marker = bytes[offset + 1], length = bytes.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
      offset += 2 + length;
    }
    throw new Error(`No JPEG dimensions in ${path}`);
  };
  for (const card of holoBulkCards.filter(card => card.franchise === 'Yu-Gi-Oh!')) {
    assert.deepEqual(jpegSize(`public${card.front}`), [813, 1185], card.title);
    assert.equal(card.maps?.foil, '/cards/shared/yugioh-standard/artwork.svg?v=4');
    assert.ok(card.maps?.metallic?.endsWith('-name.png'));
    assert.ok(card.maps?.height?.endsWith('-height.png'));
    assert.equal(card.mapSettings?.embossStrength, .12);
    assert.deepEqual(card.layout?.artwork, [96 / 813, 205 / 1185, 730 / 813, 848 / 1185]);
  }
});

test('all bulk holo cards are eligible for random pack foil slots', () => {
  for (const id of holoBulkCardIds) assert.ok(holographicCardIds.includes(id), `${id} is missing from the pack pool`);
});

test('MTG foil follows the square printed panel and laminate has no inset boundary', () => {
  const mask = readFileSync('public/cards/shared/mtg-standard/foil.svg', 'utf8');
  assert.match(mask, /x="36" y="36" width="673" height="968"/);
  assert.ok(!/\br[xy]=/.test(mask), 'rounded corners cut into the square printed panel');
  assert.equal((mask.match(/fill="#606060"/g) ?? []).length, 1);
  assert.ok(!mask.includes('y="464"'), 'legacy vertically inverted artwork patch remains');
  const laminate = readFileSync('public/cards/shared/mtg-standard/laminate.svg', 'utf8');
  assert.match(laminate, /<rect width="745" height="1040" fill="white"/);
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
