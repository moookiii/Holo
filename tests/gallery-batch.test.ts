import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galleryBatchKey, galleryOpticalLayers } from '../src/gallery/GalleryBatch.ts';

test('thin-film shader specialization keeps zero-strength cards separate from active iridescence', () => {
  const parameters = new Float32Array(44 * 4);
  parameters[31] = 1;
  const plain = galleryOpticalLayers(parameters);
  assert.equal(plain[0].iridescence, false);
  parameters[26] = .12;
  const film = galleryOpticalLayers(parameters);
  assert.equal(film[0].iridescence, true);
  assert.notEqual(galleryBatchKey(plain), galleryBatchKey(film));
  parameters[31] = 0;
  assert.equal(galleryOpticalLayers(parameters)[0].iridescence, false);
});
