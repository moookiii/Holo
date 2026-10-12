import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { tcglBwSurfaces } from '../src/pokemon/data/bw-tcgl.generated.ts';
import { bwDefinition } from '../src/pokemon/BwSurfaces.ts';

const registry = JSON.parse(readFileSync('scripts/tcgl/bw-cosmos/registration.json','utf8'));
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

test('BW Cosmos activates only reviewed exact-copy placement and preserves its clean master', () => {
  const cosmos = tcglBwSurfaces.filter(s => s.foilType === 'Cosmos');
  assert.equal(cosmos.length,48);
  assert.equal(registry.length,29);
  for (const s of cosmos) {
    const r = registry.find((r: any) => r.tcglCardId === s.tcglCardId);
    const def = bwDefinition(s.cardId,s.variant as 'holo');
    if (!r) {
      assert.equal(s.profile,'print-only');
      assert.equal(s.deferredEffect,'Cosmos registered motif placement');
      assert.deepEqual(s.maps,{});
      continue;
    }
    assert.equal(r.tcglVariantId,s.tcglVariantId);
    assert.equal(r.reviewStatus,'reviewed-visible-features');
    assert.deepEqual(r.coordinateDimensions,[600,825]);
    assert.deepEqual(r.outputDimensions,[1200,1650]);
    assert.ok(r.motifs.length > 0);
    assert.equal(s.profile,'pokemon-base-set-2-cosmos');
    assert.equal(s.deferredEffect,null);
    assert.equal(def.mapSettings!.normalScale,0);
    assert.equal(def.mapSettings!.embossStrength,0);
    assert.ok(!s.maps.normal && !s.maps.roughness);
    assert.equal(sha(r.master),r.preservedHashes.master);
    assert.equal(sha(r.destination),r.motifSha256);
    assert.equal(sha(r.source.file),r.source.sha256);
    const png=readFileSync(r.destination);
    assert.equal(png.readUInt32BE(16),1200);
    assert.equal(png.readUInt32BE(20),1650);
    assert.equal(s.maps.motif,'/'+r.destination.replace(/^public\//,''));
  }
});
