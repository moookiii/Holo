import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { tcglSmSurfaces } from '../src/pokemon/data/sm-tcgl.generated.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';

const inventory = JSON.parse(readFileSync('scripts/cosmos/inventory.json', 'utf8'));
const registry = JSON.parse(readFileSync('scripts/cosmos/registration.json', 'utf8'));
const corrections = JSON.parse(readFileSync('scripts/cosmos/corrections.json', 'utf8'));
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');

test('Cosmos authoring preserves every audited printed master and coverage mask', () => {
  assert.equal(inventory.length, 149);
  for (const c of inventory) for (const [key, hash] of Object.entries(c.preservedHashes)) {
    assert.equal(sha(c[key]), hash, `${c.cardId} ${key}`);
  }
});

test('published SM Cosmos uses reviewed per-card PNG placement with unchanged optics', () => {
  assert.ok(registry.length >= 44);
  assert.equal(new Set(registry.map((r: any) => r.cardId)).size, registry.length);
  for (const r of registry.filter((r: any) => /^(smalt|smbsp)-/.test(r.cardId))) {
    assert.equal(r.reviewStatus, 'reviewed-visible-features');
    assert.equal(corrections[r.cardId].reviewed, true);
    assert.equal(corrections[r.cardId].sourceAlignmentReviewed, true);
    assert.deepEqual(r.coordinateDimensions, [600, 825]);
    assert.deepEqual(r.outputDimensions, [1200, 1650]);
    assert.ok(r.motifs.length);
    assert.equal(sha(r.destination), r.motifSha256);
    assert.equal(sha(r.source.file), r.source.sha256);
    const png = readFileSync(r.destination);
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 1650);
    assert.equal(png[25], 0, 'grayscale motif PNG');
    const surface = tcglSmSurfaces.find(s => s.cardId === r.cardId && s.profile === 'pokemon-base-set-2-cosmos')!;
    assert.ok(surface, r.cardId);
    assert.equal(surface.maps.motif, '/' + r.destination.replace(/^public\//, ''));
    const def = svTcglDefinition(r.cardId, surface.variant as 'holo');
    assert.equal(def.profile, 'pokemon-base-set-2-cosmos');
    assert.equal(def.mapSettings!.embossStrength, 0);
    assert.equal(def.profileOverrides, undefined);
    const evidence = JSON.parse(readFileSync(r.evidence, 'utf8'));
    assert.equal(evidence.cosmosPlacement.status, r.reviewStatus);
    assert.equal(evidence.outputHashes.motif, r.motifSha256);
  }
});
