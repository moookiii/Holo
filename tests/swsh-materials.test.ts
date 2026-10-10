import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { galleryOpticalLayers, galleryBatchKey } from '../src/gallery/GalleryBatch.ts';

test('Radiant secondary survives preview packing and has its own shader batch', () => {
  const parameters = new Float32Array(44 * 4);
  parameters[63] = 1;
  parameters[31 * 4 + 3] = -4;
  const layers = galleryOpticalLayers(parameters);
  assert.equal(layers[1].radiant, true);
  assert.equal(layers[1].enabled, true);
  assert.notEqual(galleryBatchKey(layers), galleryBatchKey(layers.map(l => ({ ...l, radiant: false }))));
});

test('Proof outputs still match the exact-source evidence hashes', () => {
  const base = new URL('../public/cards/pokemon/swsh-proofs/', import.meta.url);
  const cases = JSON.parse(readFileSync(new URL('cases.json', base), 'utf8'));
  for (const card of cases) {
    const dir = new URL(`${card.tcglCardId}/`, base);
    const evidence = JSON.parse(readFileSync(new URL('evidence.json', dir), 'utf8'));
    assert.equal(evidence.tcglVariantId, card.tcglVariantId);
    assert.ok(evidence.registration.meanByteDifference < 3);
    for (const [name, hash] of Object.entries(evidence.outputs)) {
      assert.equal(createHash('sha256').update(readFileSync(new URL(name, dir))).digest('hex'), hash, `${card.tcglCardId}/${name}`);
    }
  }
});

