import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAVORITES_STORAGE_KEY, GalleryFavorites } from '../src/gallery/GalleryFavorites.ts';
import { facets, GalleryQueryIndex } from '../src/gallery/GalleryQuery.ts';
import type { CardDefinition } from '../src/card/CardDefinition.ts';

function storage(initial = '[]') {
  let value = initial;
  return { getItem: (key: string) => { assert.equal(key, FAVORITES_STORAGE_KEY); return value; },
    setItem: (key: string, next: string) => { assert.equal(key, FAVORITES_STORAGE_KEY); value = next; } };
}
test('toggles persist canonical IDs across instances without duplicates, even under rapid changes', () => {
  const saved = storage(), favorites = new GalleryFavorites(saved);
  assert.equal(favorites.toggle('sv08.5-156:holo'), true);
  assert.equal(new GalleryFavorites(saved).has('sv08.5-156:holo'), true);
  assert.equal(favorites.toggle('sv08.5-156:holo'), false);
  for (let i = 0; i < 101; i++) favorites.toggle('sv08.5-156:holo');
  assert.deepEqual(JSON.parse(saved.getItem(FAVORITES_STORAGE_KEY)), ['sv08.5-156:holo']);
});
test('stale IDs, invalid saved data, and unavailable storage are harmless', () => {
  const favorites = new GalleryFavorites(storage('["deleted","a","a",null,4,""]'));
  assert.deepEqual(favorites.filter([{ id: 'a' }, { id: 'b' }], true), [{ id: 'a' }]);
  favorites.toggle('a');
  assert.deepEqual(favorites.filter([{ id: 'a' }], true), []);
  for (const saved of ['bad json', '{}', 'null']) assert.equal(new GalleryFavorites(storage(saved)).has('a'), false);
  const blocked = new GalleryFavorites({ getItem() { throw Error(); }, setItem() { throw Error(); } });
  assert.equal(blocked.toggle('a'), true); assert.equal(blocked.toggle('a'), false);
});
test('favorites intersect search and every existing facet, retaining ordering and object identity', () => {
  const cards = [
    { id: 'a', title: 'Lugia', set: 'Neo Genesis', number: '9', franchise: 'Pokémon', profile: 'holo', pokemon: { rarity: 'Rare', category: 'Pokemon', variant: 'holo' } },
    { id: 'b', title: 'Lugia', set: 'Neo Genesis', number: '10', franchise: 'Pokémon', profile: 'holo', pokemon: { rarity: 'Rare', category: 'Pokemon', variant: 'holo' } },
    { id: 'c', title: 'Dragon', set: 'Other', number: '1', franchise: 'Yu-Gi-Oh!', profile: 'holo' },
  ] as CardDefinition[];
  const index = new GalleryQueryIndex(cards), favorites = new GalleryFavorites();
  favorites.toggle('a'); favorites.toggle('c');
  for (const facet of facets) {
    const value = facet.value(cards[0])!;
    assert.deepEqual(favorites.filter(index.filter({ search: 'lugia', [facet.key]: value }), true), [cards[0]]);
  }
  const normal = index.filter({ search: '' });
  assert.equal(favorites.filter(normal, false), normal);
  assert.deepEqual(favorites.filter(normal, true), [cards[0], cards[2]]);
  favorites.toggle('a'); assert.deepEqual(favorites.filter(normal, true), [cards[2]]);
  cards.reverse();
  cards.push({ ...cards[2], id: 'future', number: '11' }); favorites.toggle('future');
  assert.deepEqual(favorites.filter(index.filter({ search: 'lugia' }), true).map(card => card.id), ['future']);
});
