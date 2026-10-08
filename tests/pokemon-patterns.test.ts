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

test('ACE SPEC gallery fields average unresolved microcuts while retaining diamond inclinations', () => {
  for (const height of [180, 360, 720]) {
    const field = generatePokemonField('ace-spec', 2024, 6.3 / 8.8, 440, height);
    const amplitudes = new Set<number>(), grains = new Set<number>(), slopes = new Set<number>();
    for (let i = 0; i < field.direction.length; i += 4) {
      amplitudes.add(field.direction[i + 3]);
      grains.add(field.relief[i + 3]);
      slopes.add(field.relief[i + 1]);
    }
    assert.equal(amplitudes.size, 1, 'subpixel dash coverage must not beat against preview pixels');
    assert.equal(grains.size, 1, 'unresolved grain must not leave a rectangular roughness grid');
    assert.ok(slopes.size > 100, 'the broad diamond response must remain');
  }
  const viewer = generatePokemonField('ace-spec', 2024, 6.3 / 8.8, 440, 2048);
  const amplitudes = new Set<number>();
  for (let i = 3; i < viewer.direction.length; i += 4) amplitudes.add(viewer.direction[i]);
  assert.ok(amplitudes.size > 100, 'resolved viewer striations must retain their detail');
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
  for (const [kind, scale] of [['legendary-fireworks', 6.8], ['fireworks', 8.2], ['crosshatch', 270], ['ace-spec', 440]] as const) {
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

test('Legendary reverse has a dense fixed cut field without physical emboss', () => {
  for (const seed of [2002074, 1999]) {
    const field = generatePokemonField('legendary-fireworks', seed, 6.3 / 8.8, 6.8, 1024);
    let cuts = 0;
    for (let i = 0; i < field.direction.length; i += 4) {
      if (field.direction[i + 3] > 50) cuts++;
      assert.equal(field.relief[i + 2], 128, 'optical cuts must not introduce raised relief');
    }
    assert.ok(cuts / (field.width * field.height) > .35, 'sparse isolated fireworks leave too much quiet foil');
    const repeat = generatePokemonField('legendary-fireworks', seed, 6.3 / 8.8, 6.8, 1024);
    assert.deepEqual(field.direction, repeat.direction, 'cuts must remain fixed between preparations');
    assert.deepEqual(field.relief, repeat.relief);
  }
});
