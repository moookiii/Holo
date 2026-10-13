import test from 'node:test';
import assert from 'node:assert/strict';
import { createModernCosmosProfiles, modernCosmosProfileId } from '../src/materials/profiles/modernCosmos.ts';
import { previewOptics } from '../src/card/PreviewOptics.ts';
import type { CardDefinition } from '../src/card/CardDefinition.ts';
import type { HolographicProfile } from '../src/materials/HolographicProfile.ts';

const card = (seriesId: string, profile = 'pokemon-base-set-2-cosmos') => ({
  franchise: 'Pokémon', profile, pokemon: { seriesId }, dimensions: { width: 6.3, height: 8.8 }, seed: 1,
}) as CardDefinition;
const base: HolographicProfile = {
  id: 'pokemon-base-set-2-cosmos', name: 'Cosmos', family: 'Pokémon', status: 'reference-pending', description: 'Registered dots.',
  diffraction: { period: 1.32, bandwidth: .07, strength: 1.05, secondaryOrder: .08, direction: 0, crossWidth: .48, facetCoupling: 1 },
  structure: { field: 'base-set-2-cosmos', scale: 29, engraving: 0, relief: 0, facetTilt: .7 },
  glints: { density: 0, scale: 520, sharpness: 220, strength: 0, spread: .3 },
  surface: { metalness: .76, roughness: .32, laminate: .2, laminateRoughness: .32, foilReflectance: .17 },
};

test('modern native Cosmos routing covers BW onward and leaves vintage, other foils and deferred prints intact', () => {
  for (const series of ['bw', 'xy', 'sm', 'swsh', 'sv', 'me']) {
    for (const id of [base.id, 'pokemon-cosmos', 'pokemon-cosmos-hd', 'svp-cosmos', 'pokemon-evolutions-holo'])
      assert.equal(modernCosmosProfileId(card(series, id), id), `modern-${id}`);
    for (const id of ['print-only', 'pokemon-tinsel', 'prismatic_sir_texture'])
      assert.equal(modernCosmosProfileId(card(series, id), id), id);
    assert.equal(modernCosmosProfileId(card(series), 'pokemon-cosmos-hd'), 'pokemon-cosmos-hd');
  }
  for (const series of ['base', 'neo', 'ecard', 'ex', 'dp', 'hgss', ''])
    assert.equal(modernCosmosProfileId(card(series), base.id), base.id);
  assert.equal(modernCosmosProfileId({ ...card('sv'), franchise: 'Original' }, base.id), base.id);
});

test('dark backing preserves authored motifs and optical response without mutating the vintage profile', () => {
  const snapshot = structuredClone(base);
  const [modern] = createModernCosmosProfiles([{ ...base, secondary: base }]);
  assert.deepEqual(modern.diffraction, base.diffraction);
  assert.deepEqual(modern.structure, base.structure);
  assert.deepEqual(modern.glints, base.glints);
  assert.deepEqual(base, snapshot);
  assert.equal(modern.secondary!.surface.substrateDarkening, modern.surface.substrateDarkening);
  const packed = previewOptics(card('bw'), modern);
  assert.ok(Math.abs(packed[20] - modern.surface.substrateDarkening!) < 1e-6);
  assert.ok(Math.abs(packed[21] - modern.surface.substrateReflection!) < 1e-6);
  assert.ok(Math.abs(packed[52] - modern.secondary!.surface.substrateDarkening!) < 1e-6);
  assert.equal(previewOptics(card('base'), base)[20], 0);
});
