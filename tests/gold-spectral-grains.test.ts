import test from 'node:test';
import assert from 'node:assert/strict';
import { goldEtchedFinish } from '../src/materials/profiles/goldEtchedFinish.ts';
import { tcglEtchedFinish } from '../src/materials/profiles/tcglEtchedFinish.ts';
import { galleryBatchKey, galleryOpticalLayers } from '../src/gallery/GalleryBatch.ts';


test('spectral gold grains have a distinct gallery program from white metal grains', () => {
  const p = new Float32Array(44 * 4); p[31] = 1;
  p[28 * 4 + 3] = 2.4;
  p[29 * 4 + 3] = -1;
  const metal = galleryBatchKey(galleryOpticalLayers(p));
  p[29 * 4 + 3] = -5;
  const layers = galleryOpticalLayers(p);
  assert.equal(layers[0].metallicGrain, true);
  assert.equal(layers[0].spectralGrain, true);
  assert.notEqual(galleryBatchKey(layers), metal);
  assert.equal(goldEtchedFinish.glints?.spectralGrain, true);
  assert.ok(goldEtchedFinish.glints!.scale! < 350);
  assert.equal(tcglEtchedFinish.glints?.spectralGrain, undefined);
});
