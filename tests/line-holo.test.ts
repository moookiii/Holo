import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { luminousLines } from '../src/materials/profiles/luminousLines.ts';
import { pokemonProfiles } from '../src/materials/profiles/pokemon.ts';
import { generatePokemonDirectionalField } from '../src/materials/patterns/PokemonDirectionalPatterns.ts';

test('Luminous Lines preserves the original Line material and manufacturing bytes', () => {
  assert.equal(luminousLines.family, 'Original');
  assert.equal(luminousLines.structure.field, 'vertical-line');
  assert.deepEqual(luminousLines.diffraction, { period: 1.18, bandwidth: .037, strength: 1.9, secondaryOrder: .10, direction: 0, crossWidth: .44, facetCoupling: 1 });
  assert.deepEqual(luminousLines.surface, { metalness: .84, roughness: .25, laminate: .18, laminateRoughness: .32, foilReflectance: .21, sheen: .44 });
  const field = generatePokemonDirectionalField('vertical-line', 42, 600 / 825, 310, 128);
  assert.equal(createHash('sha256').update(field.direction).update(field.relief).digest('hex'), '40d28095e380a38d42c7215d17c96388987cbf0cd296836711e706349c0d7a56');
});

test('Pokémon Line keeps its registered identity with an independent vertical band field', () => {
  const profile = pokemonProfiles.find(p => p.id === 'pokemon-vertical-line')!;
  assert.equal(profile.structure.field, 'pokemon-line');
  const field = generatePokemonDirectionalField('pokemon-line', 42, 600 / 825, 400, 128);
  // Each ruling retains its grating and horizontal inclination for its full height.
  const rowBytes = field.width * 4;
  for (let x = 0; x < field.width; x++) {
    const top = x * 4, bottom = (field.height - 1) * rowBytes + top;
    assert.deepEqual(field.direction.slice(top, top + 4), field.direction.slice(bottom, bottom + 4));
    assert.equal(field.relief[top], field.relief[bottom]);
  }
});
