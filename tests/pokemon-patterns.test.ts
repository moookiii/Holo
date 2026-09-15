import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePokemonField } from '../src/materials/patterns/PokemonPatterns.ts';
import { generatePokemonDirectionalField } from '../src/materials/patterns/PokemonDirectionalPatterns.ts';
import { generatePokemonFacetField } from '../src/materials/patterns/PokemonFacetPatterns.ts';

test('Cracked Ice triangulation covers the entire sheet without missing texels or raised seams', () => {
  for (const seed of [0, 1999, 2023135]) {
    const field = generatePokemonFacetField('cracked-ice', seed, .716, 19, 513);
    for (let i = 0; i < field.direction.length; i += 4) {
      assert.ok(field.direction[i + 3] > 0, `uncovered texel ${i / 4}, seed ${seed}`);
      assert.equal(field.relief[i + 2], 128, 'triangles describe optical facets, not raised lumps');
    }
  }
});

test('ACE SPEC diamond inclinations remain continuous across cell and band boundaries', () => {
  // Regression for the square/triangular seams visible in the second render.
  // Horizontal microcuts may change amplitude abruptly, but the macro optical
  // normal must remain continuous, including at the periodic sheet boundary.
  const field = generatePokemonField('ace-spec', 2024, 6.3 / 8.8, 440, 512);
  let maximum = 0;
  for (let y = 0; y < field.height; y++) for (let x = 0; x < field.width; x++) {
    const i = (y * field.width + x) * 4;
    for (const neighbor of [x + 1 < field.width ? i + 4 : -1, y + 1 < field.height ? i + field.width * 4 : -1]) {
      if (neighbor < 0) continue;
      maximum = Math.max(maximum, Math.abs(field.relief[i] - field.relief[neighbor]), Math.abs(field.relief[i + 1] - field.relief[neighbor + 1]));
    }
  }
  assert.ok(maximum <= 12, `discontinuous foil normal: ${maximum}/255 between adjacent texels`);
});

test('smooth directional films have continuous sheet normals without tile seams or physical ridges', () => {
  for (const kind of ['e-reader', 'sheen', 'water-web', 'mirage'] as const) {
    const field = generatePokemonDirectionalField(kind, 2023135, .716, 800, 512);
    let maximum = 0;
    for (let y = 0; y < field.height - 1; y++) for (let x = 0; x < field.width - 1; x++) {
      const i = (y * field.width + x) * 4;
      for (const neighbor of [i + 4, i + field.width * 4]) for (const channel of [0, 1]) {
        maximum = Math.max(maximum, Math.abs(field.relief[i + channel] - field.relief[neighbor + channel]));
      }
      assert.equal(field.relief[i + 2], 128, 'optical bands must not become embossed ridges');
    }
    assert.ok(maximum < 12, `${kind} sheet discontinuity ${maximum}/255`);
  }
});

test('manufactured Pokémon sheets preserve physical pattern scale across card aspect ratios', () => {
  // A wider card exposes more of the same sheet; it must not stretch/reseed it.
  for (const [kind, scale] of [['legendary-fireworks', 4.7], ['fireworks', 8.2], ['crosshatch', 270], ['ace-spec', 440]] as const) {
    const narrow = generatePokemonField(kind, 1999, .70, scale, 256);
    const wide = generatePokemonField(kind, 1999, .82, scale, 256);
    for (let y = 0; y < narrow.height; y++) {
      assert.deepEqual(narrow.direction.subarray(y * narrow.width * 4, (y + 1) * narrow.width * 4),
        wide.direction.subarray(y * wide.width * 4, (y * wide.width + narrow.width) * 4));
      assert.deepEqual(narrow.relief.subarray(y * narrow.width * 4, (y + 1) * narrow.width * 4),
        wide.relief.subarray(y * wide.width * 4, (y * wide.width + narrow.width) * 4));
    }
  }
});
