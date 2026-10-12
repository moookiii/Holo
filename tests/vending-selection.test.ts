import test from 'node:test';
import assert from 'node:assert/strict';
import { filterProducts, selectArtwork, type VendingProduct } from '../src/vending/types.ts';
import { isPokemonPackSet } from '../src/pokemon/packCatalog.ts';

const product: VendingProduct = { id: 'set', name: 'Example Set', era: 'era', available: true,
  artwork: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], selection: productId => ({ game: 'magic', productId }) };
test('Random and explicit artwork resolve within the selected product', () => {
  assert.deepEqual(selectArtwork(product, 'random', () => 0), { game: 'magic', productId: 'a' });
  assert.deepEqual(selectArtwork(product, 'random', () => .999), { game: 'magic', productId: 'b' });
  assert.deepEqual(selectArtwork(product, 'b'), { game: 'magic', productId: 'b' });
  assert.throws(() => selectArtwork(product, 'other'), /unavailable/);
});
test('Browse-only entries cannot invoke opening even with an accidental selection callback', () => {
  assert.throws(() => selectArtwork({ ...product, available: false }, 'a'), /browse only/);
  assert.throws(() => selectArtwork({ ...product, artwork: [] }, 'random'), /browse only/);
});
test('Pack search retains future openings even without wrappers or a validated recipe', () => {
  const pending = { ...product, id: 'pending', name: 'Future Pack', available: false, artwork: [], selection: undefined };
  const catalog = [product, pending];
  assert.deepEqual(filterProducts(catalog, ''), catalog);
  assert.deepEqual(filterProducts(catalog, '  EXAMPLE '), [product]);
  assert.deepEqual(filterProducts(catalog, 'future'), [pending]);
  assert.throws(() => selectArtwork(pending, 'random'), /browse only/);
  assert.equal(catalog.length, 2);
});
test('Pokémon pack identity excludes non-pack products but retains unfinished expansions', () => {
  for (const [id, name] of [['sve', 'Scarlet & Violet Energy'], ['basep', 'Wizards Black Star Promos'],
    ['xy0', 'Kalos Starter Set'], ['mfb', 'My First Battle'], ['sp', 'Sample Set'],
    ['swsh9a', 'Brilliant Stars'], ['xy9-5r', 'Generations'], ['unknown', 'Theme Deck']]) {
    assert.equal(isPokemonPackSet({ id, name }), false, name);
  }
  for (const [id, name] of [['sv08.5', 'Prismatic Evolutions'], ['ecard3', 'Skyridge'],
    ['dp1', 'Diamond & Pearl'], ['pop1', 'POP Series 1'], ['lc', 'Legendary Collection']]) {
    assert.equal(isPokemonPackSet({ id, name }), true, name);
  }
});
