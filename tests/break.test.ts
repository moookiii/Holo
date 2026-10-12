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

test('BREAK filtering conserves domain area and never generates height or normals', () => {
  for (const height of [127, 256, 1024]) {
    const field = generateBreakSquares(6.3 / 8.8, 16.4, height);
    for (let i = 0; i < field.direction.length; i += 4) {
      assert.equal(field.direction.slice(i, i + 4).reduce((a, b) => a + b), 255);
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
