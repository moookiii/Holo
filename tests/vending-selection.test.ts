import test from 'node:test';
import assert from 'node:assert/strict';
import { filterProducts, selectArtwork, type VendingProduct } from '../src/vending/types.ts';

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
test('Pack search excludes unavailable entries and missing wrappers without mutating the catalog', () => {
  const catalog = [product,
    ...['Energy cards', 'Promos', 'Starter Deck'].map(name => ({ ...product, id: name, name, available: false })),
    { ...product, id: 'missing-art', artwork: [] }];
  assert.deepEqual(filterProducts(catalog, ''), [product]);
  assert.deepEqual(filterProducts(catalog, '  EXAMPLE '), [product]);
  assert.deepEqual(filterProducts(catalog, 'promos'), []);
  assert.equal(catalog.length, 5);
});
