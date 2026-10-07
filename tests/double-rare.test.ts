import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { doubleRareProfile } from '../src/materials/profiles/doubleRare.ts';
import { galleryOpticalLayers, galleryBatchKey } from '../src/gallery/GalleryBatch.ts';
import { tcgl151Surfaces } from '../src/pokemon/data/151-surfaces.generated.ts';

test('every 151 Double Rare retains the exact source-derived foil and authoritative protection bytes', () => {
  const entries = tcgl151Surfaces.filter(s => s.profile === 'pokemon151_ex_holo');
  assert.equal(entries.length, 12);
  for (const entry of entries) {
    assert.equal(entry.foilType, 'SUN_PILLAR');
    assert.equal(entry.textured, false);
    const evidence = JSON.parse(readFileSync(`public${entry.evidence}`, 'utf8'));
    for (const kind of ['foil', 'protection'] as const) {
      const path = entry.maps[kind]!;
      const hash = createHash('sha256').update(readFileSync(`public${path}`)).digest('hex');
      assert.equal(hash, evidence.maps[path.split('/').at(-1)!], `${entry.cardId}: ${kind} was changed`);
    }
  }
});

test('Double Rare and Illustration Rare have separate gallery batches; no procedural sparkle variant', () => {
  const p = new Float32Array(44 * 4); p[31] = 1;
  const generic = galleryBatchKey(galleryOpticalLayers(p));
  p[139] = 1; const ir = galleryBatchKey(galleryOpticalLayers(p));
  p[139] = 2; const layers = galleryOpticalLayers(p);
  assert.equal(layers[0].doubleRare, true);
  assert.equal(layers[0].glints, false);
  assert.equal(layers[1].doubleRare, undefined);
  assert.equal(new Set([generic, ir, galleryBatchKey(layers)]).size, 3);
  p[31] = 0; assert.equal(galleryBatchKey(galleryOpticalLayers(p)), '---');
});

test('source-driven Double Rare has no generated relief, cut field, or random stars', () => {
  const p = doubleRareProfile;
  assert.equal(p.opticalModel, 'sv-double-rare');
  assert.equal(p.structure.field, 'plain');
  assert.equal(p.structure.facetTilt, 0);
  assert.equal(p.structure.relief, 0);
  assert.equal(p.glints.strength, 0);
  assert.equal(p.mapSettings?.embossStrength, 0);
  assert.equal(p.surface.inkTransmission, 1);
});
