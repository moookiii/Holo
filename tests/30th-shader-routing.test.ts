import test from 'node:test';
import assert from 'node:assert/strict';
import { celebrationCards } from '../src/pokemon/CelebrationCatalog.ts';
import { celebrationDefinition } from '../src/pokemon/CelebrationSurfaces.ts';
import { galleryBatchKey, galleryOpticalLayers } from '../src/gallery/GalleryBatch.ts';
import { tcglEtchedFinish } from '../src/materials/profiles/tcglEtchedFinish.ts';

test('anniversary ex restores SUN_PILLAR without borrowing the legacy star texture', () => {
  const cards = celebrationCards.filter(card => card.rarity === 'Double Rare');
  assert.equal(cards.length, 12);
  for (const card of cards) {
    const definition = celebrationDefinition(card.id);
    assert.equal(definition.profileOverrides?.opticalModel, 'sv-sun-pillar');
    assert.equal(definition.profileOverrides?.maps?.direction, undefined);
    assert.equal(definition.maps?.normal, undefined);
    assert.equal(definition.mapSettings?.embossStrength, 0);
  }
  for (const card of celebrationCards.filter(card => card.rarity === 'Illustration Rare'))
    assert.equal(celebrationDefinition(card.id).profileOverrides?.opticalModel, 'sv151-illustration');
});

test('all etched anniversary cards retain the mandated single normal response', () => {
  const etched = celebrationCards.map(card => celebrationDefinition(card.id)).filter(card => card.maps?.normal);
  assert.equal(etched.length, 45);
  for (const card of etched) assert.deepEqual(card.profileOverrides, tcglEtchedFinish);
});

test('star-free SUN_PILLAR gallery batches cannot inherit legacy star shaders', () => {
  const values = new Float32Array(44 * 4);
  values[31] = 1;
  values[34 * 4 + 3] = 7;
  const sun = galleryOpticalLayers(values);
  assert.equal(sun[0].sunPillar, true);
  assert.equal(sun[0].doubleRare, undefined);
  values[34 * 4 + 3] = 2;
  assert.notEqual(galleryBatchKey(sun), galleryBatchKey(galleryOpticalLayers(values)));
});
