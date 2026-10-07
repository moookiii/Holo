import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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

test('all sixteen smooth IR printings have registered attenuation and silver maps', () => {
  const root = new URL('../public/cards/pokemon/151/ir/', import.meta.url);
  const evidence = JSON.parse(readFileSync(new URL('evidence.json', root), 'utf8'));
  assert.equal(evidence.cards.length, 16);
  for (let i = 0; i < 16; i++) {
    const card = evidence.cards[i];
    assert.equal(card.cardId, `sv03.5-${166 + i}`);
    assert.match(card.tcglVariantId, /IllustrationRare_SunPillar_Holo$/);
    for (const map of Object.values(card.outputs) as {file: string}[]) assert.ok(existsSync(new URL(map.file, root)));
  }
});
