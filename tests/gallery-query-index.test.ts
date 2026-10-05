import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterCards, GalleryQueryIndex } from '../src/gallery/GalleryQuery.ts';
import type { CardDefinition } from '../src/card/CardDefinition.ts';

const fixtures = () => [
  { id: 'lugia', title: 'Lugia', set: 'Neo Genesis', number: '9', franchise: 'Pokémon', profile: 'holo', maps: {} },
  { id: 'lugia-duplicate', title: 'Lugia', set: 'Neo Genesis', number: '9', franchise: 'Pokémon', profile: 'holo' },
  { id: 'bulbasaur', title: 'Bulbasaur', set: 'Base Set · Non-holo', number: '44', franchise: 'Pokémon', profile: 'print-only' },
  { id: 'reverse', title: 'Lugia', set: 'Neo Genesis', number: '9 · Reverse', franchise: 'Pokémon', profile: 'holo', pokemon: { variant: 'reverse' } },
  { id: 'dragon', title: 'Blue-Eyes White Dragon', set: 'LOB-EN001 · Ultra Rare', number: 'LOB-EN001', franchise: 'Yu-Gi-Oh!', profile: 'holo' },
  { id: 'hidden', title: 'Hidden', set: 'Other', number: '1', franchise: 'Original', pickerHidden: true },
] as CardDefinition[];

test('indexed queries retain duplicate masters, ordering, aliases and finish matching', () => {
  const cards = fixtures(), index = new GalleryQueryIndex(cards);
  for (const query of [{ search: '' }, { search: '  LUGIA  neo ' }, { search: '', game: 'Pokémon', finish: 'holo' },
    { search: '', set: 'Base Set' }, { search: 'lob', rarity: 'Ultra Rare' }]) {
    assert.deepEqual(index.filter(query), filterCards(cards, query));
  }
});

test('pack additions, imported removal and replacement invalidate the same array index', () => {
  const cards = fixtures(), index = new GalleryQueryIndex(cards);
  index.filter({ search: '' });
  cards.push({ ...cards[0], id: 'new-import', imported: true, title: 'New import' } as CardDefinition);
  assert.deepEqual(index.filter({ search: 'new' }).map(card => card.id), ['new-import']);
  cards.splice(cards.length - 1, 1);
  cards[0] = { ...cards[0], title: 'Replacement' };
  assert.deepEqual(index.filter({ search: 'replacement' }), filterCards(cards, { search: 'replacement' }));
  assert.deepEqual(index.cards(), filterCards(cards, { search: '' }));
});
