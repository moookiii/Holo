import test from 'node:test';
import assert from 'node:assert/strict';
import { physicalCardProfiles, resolvePhysicalCardProfile } from '../src/materials/PhysicalCardProfile.ts';
import { alphaCards } from '../src/magic/AlphaCatalog.ts';
import { magicDefinition } from '../src/magic/materials.ts';

test('physical profile selection is independent of foil and allows explicit manufacturing identity', () => {
  assert.equal(resolvePhysicalCardProfile({ franchise: 'Pokémon' }).id, 'pokemon');
  assert.equal(resolvePhysicalCardProfile({ franchise: 'Magic: The Gathering' }).id, 'mtg');
  assert.equal(resolvePhysicalCardProfile({ franchise: 'Original', physicalProfile: 'pokemon' }).id, 'pokemon');
  const override = resolvePhysicalCardProfile({ franchise: 'Pokémon', stockSurface: { strength: 0, depth: .001 } });
  assert.equal(override.grainStrength, 0);
  assert.equal(override.microreliefDepth, .001);
  assert.equal(physicalCardProfiles.pokemon.grainStrength, .55);
  assert.equal(resolvePhysicalCardProfile({ franchise: 'Pokémon', construction: { kind: 'metal', frontReliefCm: .01, backReliefCm: .01 } }).grainStrength, 0);
});

test('Alpha uses restrained MTG stock while remaining entirely print-only', () => {
  for (const card of alphaCards) {
    const definition = magicDefinition(card), stock = resolvePhysicalCardProfile(definition);
    assert.equal(stock.id, 'mtg');
    assert.equal(definition.profile, 'print-only');
    assert.equal(definition.maps, undefined);
    assert.equal(definition.backProfile, undefined);
    assert.ok(stock.coatingStrength < physicalCardProfiles.pokemon.coatingStrength);
    assert.ok(stock.microreliefDepth < physicalCardProfiles['yugioh-current'].microreliefDepth / 5);
  }
});

test('legacy Yu-Gi-Oh stock retains its existing relief and coating calibration', () => {
  const stock = resolvePhysicalCardProfile({ franchise: 'Yu-Gi-Oh!' });
  assert.deepEqual([stock.grainStrength, stock.grainScale, stock.fineGrainScale, stock.microreliefDepth,
    stock.roughnessVariance, stock.coatingStrength, stock.coatingRoughness, stock.microNormalStrength],
  [1, 52, 125, .0024, .12, .42, .24, .7]);
  assert.deepEqual(stock.back, { clearcoat: .18, clearcoatRoughness: .38 });
});
