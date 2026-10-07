import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galleryBatchKey, galleryOpticalLayers } from '../src/gallery/GalleryBatch.ts';

test('151 IR gets its shared optical kernel rather than the generic gallery grating batch', () => {
  const parameters = new Float32Array(44 * 4);
  parameters[31] = 1;
  const generic = galleryOpticalLayers(parameters);
  parameters[34 * 4 + 3] = 1;
  const illustration = galleryOpticalLayers(parameters);
  assert.equal(illustration[0].illustrationRare, true);
  assert.notEqual(galleryBatchKey(generic), galleryBatchKey(illustration));
  assert.equal(illustration[1].illustrationRare, undefined);
});
