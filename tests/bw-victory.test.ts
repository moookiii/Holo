import test from 'node:test';
import assert from 'node:assert/strict';
import { bwDefinition } from '../src/pokemon/BwSurfaces.ts';
import { tcglBwSurfaces } from '../src/pokemon/data/bw-tcgl.generated.ts';
import { bwVictorySurface } from '../src/pokemon/BwVictorySurfaces.ts';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('only the three cups and two unreleased English fronts change classification', () => {
  const changed = tcglBwSurfaces.filter(s => bwVictorySurface(s) !== s);
  assert.deepEqual(changed.map(s => s.cardId).sort(), ['bwbsp-29','bwbsp-30','bwbsp-31','bwbsp-77','bwbsp-78']);
  for (const n of [29,30,31]) {
    const d = bwDefinition(`bwbsp-${n}`, 'holo');
    assert.equal(d.profile, 'pokemon-crosshatch');
    assert.equal(d.pokemon?.treatmentStatus, undefined);
    assert.doesNotMatch(d.number, /pending/);
    assert.equal(d.maps?.normal, undefined);
    assert.equal(d.maps?.height, undefined);
    assert.equal(d.mapSettings?.roughnessMode, 'profile');
    const e = JSON.parse(readFileSync('public' + d.source!.metadata, 'utf8'));
    for (const [name, hash] of Object.entries(e.outputs))
      assert.equal(createHash('sha256').update(readFileSync(`public/cards/pokemon/bw-victory/bwbsp-${n}/${name}`)).digest('hex'), hash);
  }
  for (const n of [77,78]) {
    const d = bwDefinition(`bwbsp-${n}`, 'holo');
    assert.equal(d.profile, 'print-only');
    assert.deepEqual(d.maps, {});
    assert.equal(d.pokemon?.treatmentStatus, undefined);
    assert.match(d.number, /Unreleased English promo/);
    assert.doesNotMatch(d.number, /Holo|pending/);
  }
});
