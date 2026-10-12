import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBreakSquares } from '../src/materials/patterns/BreakSquares.ts';
import { tcglXySurfaces } from '../src/pokemon/data/xy-tcgl.generated.ts';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pokemonBreak } from '../src/materials/profiles/break.ts';
import { previewOptics } from '../src/card/PreviewOptics.ts';
import { galleryOpticalLayers, galleryBatchKey } from '../src/gallery/GalleryBatch.ts';
import { xyDefinition } from '../src/pokemon/XySurfaces.ts';

test('BREAK stores bounded optical moments and never generates height or normals', () => {
  for (const height of [127, 256, 1024]) {
    const field = generateBreakSquares(6.3 / 8.8, 16.4, height);
    for (let i = 0; i < field.direction.length; i += 4) {
      const m = [...field.direction.slice(i, i + 4)].map(v => v / 255 * 2 - 1);
      assert.ok(Math.hypot(m[0], m[1]) <= 1.006);
      assert.ok(Math.hypot(m[2], m[3]) <= 1.006);
      assert.deepEqual([...field.relief.slice(i, i + 3)], [128, 128, 128]);
    }
  }
});

test('BREAK domains are repeatable and preserve square scale across card widths', () => {
  const a = generateBreakSquares(.716, 16.4, 256), b = generateBreakSquares(.82, 16.4, 256);
  assert.deepEqual(a, generateBreakSquares(.716, 16.4, 256));
  for (let y = 0; y < a.height; y++) assert.deepEqual(
    a.direction.slice(y * a.width * 4, (y + 1) * a.width * 4),
    b.direction.slice(y * b.width * 4, (y * b.width + a.width) * 4));
});

test('fan directions turn inside an axis-aligned square without moving its boundary', () => {
  const height = 512, scale = 16.4, f = generateBreakSquares(.716, scale, height);
  const at = (u: number, v: number) => {
    const x = Math.floor((u - .17) / scale * height), y = Math.floor((v - .31) / scale * height);
    const i = (y * f.width + x) * 4;
    return [...f.direction.slice(i, i + 4)].map(n => n / 255 * 2 - 1);
  };
  // Both samples belong to square (2,2), on perpendicular centre radii.
  const right = at(2.75, 2.5), above = at(2.5, 2.75);
  assert.ok(right[0] > .97 && Math.abs(right[1]) < .12);
  assert.ok(above[0] < -.97 && Math.abs(above[1]) < .12);
  // Rotating projected light by 90 degrees swaps their optical selection.
  assert.ok(right[0] > above[0]);
  assert.ok(-above[0] > -right[0]);
  assert.equal(pokemonBreak.structure.facetTilt, 0);
  assert.equal(pokemonBreak.structure.reflectionCoupling, 0);
  assert.equal(pokemonBreak.structure.relief, 0);
  assert.equal(pokemonBreak.glints.strength, 0);
});

test('all 35 exact BREAK printings retain their source identities, own maps and no fabricated etch', () => {
  const surfaces = tcglXySurfaces.filter(s => s.tcglVariantId.includes('_BreakRare_Squares_Holo'));
  assert.equal(surfaces.length, 35);
  for (const s of surfaces) {
    const def = xyDefinition(s.cardId, 'holo');
    assert.equal(def.profile, 'pokemon-break');
    assert.equal(s.deferredEffect, null);
    assert.equal(def.maps?.normal, undefined);
    assert.equal(def.maps?.height, undefined);
    assert.equal(def.mapSettings?.embossStrength, 0);
    assert.deepEqual(def.substrate?.color, [.62, .65, .68]);
    assert.equal(def.stockSurface?.strength, 0);
    const evidence = JSON.parse(readFileSync(`public/cards/pokemon/tcgl-xy/${s.tcglCardId}/break-evidence.json`, 'utf8'));
    for (const output of Object.values(evidence.outputs) as {path: string; sha256: string}[]) {
      assert.ok(output.path.includes(`/${s.tcglCardId}/`));
      assert.equal(createHash('sha256').update(readFileSync('public' + output.path)).digest('hex'), output.sha256);
    }
    for (const kind of ['front', 'foil']) assert.equal(createHash('sha256')
      .update(readFileSync(`public/cards/pokemon/tcgl-xy/${s.tcglCardId}/original-${kind}.png`)).digest('hex'), evidence.sourceHashes[kind]);
    const layers = galleryOpticalLayers(previewOptics(def, pokemonBreak));
    assert.equal(layers[0].pokemonBreak, true);
    assert.equal(galleryBatchKey(layers), 'br--');
  }
});
