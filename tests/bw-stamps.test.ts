import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { bwDefinition } from '../src/pokemon/BwSurfaces.ts';
import { bwStamped } from '../src/materials/profiles/bwStamped.ts';

test('exact Worlds promos activate only their own glyph plates without relief', () => {
  for (const n of [28, 50, 95]) {
    const card = bwDefinition(`bwbsp-${n}`, 'holo');
    assert.equal(card.profile, 'bw-stamped');
    assert.equal(card.pokemon?.treatmentStatus, undefined);
    assert.equal(card.mapSettings?.normalScale, 0);
    assert.equal(card.mapSettings?.embossStrength, 0);
    assert.equal(card.maps?.normal, undefined);
    assert.equal(card.maps?.height, undefined);
    const evidence = JSON.parse(readFileSync(`public${card.source!.metadata}`, 'utf8'));
    assert.match(evidence.tcglVariantId, /_op_Rare_Stamped_Stamped$/);
    assert.equal(evidence.stampReview.verticalFlip, false);
    for (const [key, url] of Object.entries(card.maps!)) {
      const path = `public${url}`;
      assert.ok(existsSync(path));
      assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), evidence.stampReview.hashes[key]);
    }
  }
  assert.equal(bwStamped.structure.relief, 0);
  assert.equal(bwStamped.structure.engraving, 0);
  assert.equal(bwStamped.glints.strength, 0);
  assert.ok(bwStamped.diffraction.strength > 0);
  assert.notEqual(bwDefinition('bwbsp-29', 'holo').profile, 'bw-stamped');
});
