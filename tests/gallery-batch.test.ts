import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galleryBatchKey, galleryOpticalLayers, galleryShaderLayers } from '../src/gallery/GalleryBatch.ts';

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

test('nonfoil previews share the basic foil program without enabling their packed material', () => {
  const parameters = new Float32Array(44 * 4);
  const nonfoil = galleryOpticalLayers(parameters);
  parameters[31] = 1;
  const foil = galleryOpticalLayers(parameters);
  assert.equal(galleryBatchKey(galleryShaderLayers(nonfoil)), galleryBatchKey(foil));
  assert.equal(nonfoil[0].enabled, false);
  parameters[28 * 4 + 3] = 10;
  assert.notEqual(galleryBatchKey(galleryShaderLayers(nonfoil)), galleryBatchKey(galleryOpticalLayers(parameters)));
});
