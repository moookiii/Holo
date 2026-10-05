import test from 'node:test';
import assert from 'node:assert/strict';
import { galleryPreparationIndices } from '../src/gallery/GalleryPreparationRange.ts';

test('prepare nearest forward rows before trailing rows without including visible cards', () => {
  assert.deepEqual(galleryPreparationIndices(1000, 2, 8, 11, 1), [12, 13, 14, 15, 16, 17, 6, 7]);
  assert.deepEqual(galleryPreparationIndices(1000, 2, 8, 11, -1), [6, 7, 4, 5, 2, 3, 12, 13]);
});
test('lookahead remains bounded at collection edges and after layout changes', () => {
  assert.deepEqual(galleryPreparationIndices(7, 3, 0, 5, 1), [6]);
  assert.deepEqual(galleryPreparationIndices(7, 3, 6, 6, -1), [3, 4, 5, 0, 1, 2]);
  assert.deepEqual(galleryPreparationIndices(0, 4, -1, -1, 1), []);
  assert.equal(galleryPreparationIndices(10000, 6, 600, 617, 1).length, 24);
});
