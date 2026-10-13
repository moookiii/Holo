import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tcglXySurfaces } from '../src/pokemon/data/xy-tcgl.generated.ts';
import { xyStampedSurface, xyWorldsStampNumbers } from '../src/pokemon/XyStampedSurfaces.ts';
import { xyDefinition } from '../src/pokemon/XySurfaces.ts';

test('only three exact logo printings activate; fronts and other finishes remain unchanged', () => {
  const changed = tcglXySurfaces.filter(s => xyStampedSurface(s) !== s);
  assert.deepEqual(changed.map(s => Number(s.cardId.slice(6))).sort((a,b) => a-b), [...xyWorldsStampNumbers]);
  for (const s of changed) {
    const d = xyDefinition(s.cardId, 'holo');
    assert.equal(d.profile, 'bw-stamped');
    assert.equal(d.pokemon?.treatmentStatus, undefined);
    assert.doesNotMatch(d.number, /pending/);
    assert.equal(d.maps?.normal, undefined);
    assert.equal(d.maps?.height, undefined);
    assert.equal(d.mapSettings?.embossStrength, 0);
    const e = JSON.parse(readFileSync('public' + d.source!.metadata, 'utf8'));
    const original = JSON.parse(readFileSync('public' + e.originalEvidence, 'utf8'));
    assert.equal(e.tcglVariantId, s.tcglVariantId);
    assert.equal(e.originalFrontSha256, original.sources.front.sha256);
    assert.equal(e.originalFoilSha256, createHash('sha256').update(readFileSync('public' + s.originalAssets.foil)).digest('hex'));
    for (const [name, hash] of Object.entries(e.outputs)) {
      const path = `public/cards/pokemon/xy-worlds-stamps/${s.cardId}/${name}`;
      assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), hash);
    }
    assert.deepEqual(e.dimensions, [733,1024]);
    assert.equal(e.verticalFlip, false);
  }
});
