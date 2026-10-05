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
test('Search composes with availability without mutating source metadata', () => {
  const catalog = [product, { ...product, id: 'other', name: 'Other Set', available: false }];
  assert.deepEqual(filterProducts(catalog, '  EXAMPLE ', 'openable'), [product]);
  assert.equal(filterProducts(catalog, '', 'browse')[0].id, 'other');
  assert.equal(filterProducts(catalog, 'example', 'browse').length, 0);
  assert.equal(catalog.length, 2);
});
