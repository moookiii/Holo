import test from 'node:test';
import assert from 'node:assert/strict';
import { celebrationDefinition } from '../src/pokemon/CelebrationSurfaces.ts';
import { withCelebrationSpecialty } from '../src/pokemon/CelebrationSpecialty.ts';
import { celebrationSpecialtyProfiles } from '../src/materials/profiles/celebration.ts';
import { galleryBatchKey, galleryOpticalLayers } from '../src/gallery/GalleryBatch.ts';
import { tcglEtchedFinish } from '../src/materials/profiles/tcglEtchedFinish.ts';

const stock = { direction: '/test-only/optical-stock.png', evidence: '/test-only/evidence.json' };
test('specialty authoring requires source data and cannot change unrelated printings', () => {
  assert.throws(() => withCelebrationSpecialty(celebrationDefinition('30th-023'), { ...stock, evidence: '' }));
  assert.throws(() => withCelebrationSpecialty(celebrationDefinition('30th-001'), stock));
  assert.throws(() => withCelebrationSpecialty(celebrationDefinition('30th-classic-001'), stock));
  const pika = withCelebrationSpecialty(celebrationDefinition('30th-023'), stock);
  assert.equal(pika.profile, 'celebration-pikachu-fireworks');
  assert.equal(pika.maps?.direction, stock.direction);
  assert.equal(pika.mapSettings?.embossStrength, 0);
});
test('Classic specialty preserves its entire required primary etched response', () => {
  const source = celebrationDefinition('30th-classic-001');
  assert.throws(() => withCelebrationSpecialty(source, { ...stock, secondaryFoil: '/test-only/secondary.png' }));
  const card = withCelebrationSpecialty(source, { ...stock, secondaryFoil: '/test-only/secondary.png', roughness: '/test-only/roughness.png' });
  for (const key of ['diffraction', 'structure', 'surface', 'mapSettings'] as const)
    assert.deepEqual(card.profileOverrides?.[key], tcglEtchedFinish[key]);
  assert.equal(card.maps?.normal, source.maps?.normal);
  assert.equal(card.maps?.foil, source.maps?.foil);
  assert.equal(card.maps?.protection, source.maps?.protection);
  assert.equal(card.front, source.front);
  assert.equal(card.maps?.roughness, '/test-only/roughness.png');
  assert.equal(card.profileOverrides?.secondaryProfile, 'celebration-classic-stock');
  assert.equal(card.profileOverrides?.secondary?.glints?.strength, 0);
});
test('specialty gallery models work in secondary regions and use separate shader batches', () => {
  const p = new Float32Array(44 * 4); p[31] = 1; p[63] = 1;
  const plain = galleryBatchKey(galleryOpticalLayers(p));
  p[29 * 4 + 3] = -2; p[31 * 4 + 3] = -3;
  const layers = galleryOpticalLayers(p);
  assert.equal(layers[0].celebrationPikachu, true);
  assert.equal(layers[1].celebrationClassic, true);
  assert.notEqual(galleryBatchKey(layers), plain);
  assert.ok(celebrationSpecialtyProfiles.every(profile => profile.labOnly && profile.glints.strength === 0));
});
