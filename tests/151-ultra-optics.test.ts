import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tcgl151Surfaces } from '../src/pokemon/data/151-surfaces.generated.ts';
import { galleryOpticalLayers, galleryBatchKey } from '../src/gallery/GalleryBatch.ts';

test('all sixteen 151 Ultra Rares retain original art, cutouts, roughness and exact TCGL normals', () => {
  const cards = tcgl151Surfaces.filter(s => s.profile === 'pokemon151_fullart_texture');
  assert.equal(cards.length, 16);
  for (const card of cards) {
    const evidence = JSON.parse(readFileSync(`public${card.evidence}`, 'utf8'));
    assert.match(evidence.tcglVariantId, /_UltraRare_SunPillar_Etched$/);
    assert.equal(card.foilType, 'SUN_PILLAR');
    assert.equal(card.textured, true);
    assert.deepEqual(evidence.mapSize, [1800, 2475]);
    for (const path of Object.values(card.maps)) {
      const bytes = readFileSync(`public${path}`);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), evidence.maps[path.split('/').at(-1)!], `${card.cardId}: ${path}`);
    }
    const number = card.cardId.split('-').at(-1);
    assert.equal(createHash('sha256').update(readFileSync(`public/cards/pokemon/151/${number}.png`)).digest('hex'), evidence.holoFrontSha256);
    assert.equal(card.maps.height, undefined);
  }
});

test('Ultra Rare batches cannot fall back to the IR, Double Rare, or generic shader', () => {
  const p = new Float32Array(44 * 4); p[31] = 1;
  const keys = [0, 1, 2, 3].map(model => { p[139] = model; return galleryBatchKey(galleryOpticalLayers(p)); });
  assert.equal(new Set(keys).size, 4);
  const layers = galleryOpticalLayers(p);
  assert.equal(layers[0].ultraRare, true);
  assert.equal(layers[0].glints, false);
  assert.equal(layers[1].ultraRare, undefined);
  p[31] = 0;
  assert.equal(galleryBatchKey(galleryOpticalLayers(p)), '---');
});
