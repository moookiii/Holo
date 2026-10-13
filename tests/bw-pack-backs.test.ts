import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { bwWrappers } from '../src/pokemon/data/bw-wrappers.generated.ts';
import { localBoosterArt } from '../src/pokemon/boosterArt.ts';
import { packBacks } from '../src/pokemon/packBacks.ts';

test('all 49 BW fronts resolve to an authored expansion reverse', () => {
  assert.equal(Object.keys(bwWrappers).length, 12);
  let count = 0;
  for (const [id, fronts] of Object.entries(bwWrappers)) {
    const boosters = localBoosterArt(id)!;
    assert.equal(boosters.length, fronts.length);
    for (const booster of boosters) {
      assert.equal(booster.back, `/packs/pokemon/${id}-back.png`);
      count++;
    }
  }
  assert.equal(count, 49);
});

test('BW reverse PNGs match preserved native-source evidence', () => {
  const sources = JSON.parse(readFileSync('public/packs/pokemon/bw-back-sources.json', 'utf8'));
  assert.deepEqual(sources.map((s: {setId: string}) => s.setId).sort(), Object.keys(bwWrappers).sort());
  for (const source of sources) {
    assert.equal(packBacks[source.setId], `${source.setId}-back.png`);
    const bytes = readFileSync(source.output);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes[25], 6, 'RGBA PNG preserves traced wrapper edge');
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], source.dimensions);
    assert.ok(source.dimensions[0] >= 550 && source.dimensions[1] >= 1100);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
    assert.match(source.sourceSha256, /^[0-9a-f]{64}$/);
    assert.equal(source.quad.length, 4);
    assert.ok(source.outline.length >= 10);
    assert.match(source.url, /^https:\/\/i\.ebayimg\.com\//);
    assert.ok(source.review.length > 40);
  }
});
