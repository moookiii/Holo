import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { localBoosterArt } from '../src/pokemon/boosterArt.ts';
import { pokemonRecipes } from '../src/pokemon/recipes.ts';
import { packBacks } from '../src/pokemon/packBacks.ts';

test('every added Pokemon product and every art variant has a local reverse', () => {
  for (const setId of new Set(pokemonRecipes.map(recipe => recipe.setId))) {
    const boosters = localBoosterArt(setId);
    assert.ok(boosters?.length, `${setId} needs wrapper artwork`);
    for (const booster of boosters) {
      assert.ok(booster.back?.startsWith('/packs/pokemon/'), `${setId}/${booster.id} needs a real local back`);
      assert.ok(existsSync(`public${booster.back}`), `${setId}/${booster.id} back must exist`);
    }
  }
});

test('new pack backs have reproducible source evidence and native PNG detail', () => {
  const sources = JSON.parse(readFileSync('public/packs/pokemon/back-sources.json', 'utf8'));
  assert.equal(new Set(sources.map((s: { setId: string }) => s.setId)).size, sources.length);
  for (const source of sources) {
    assert.equal(packBacks[source.setId], `${source.setId}-back.png`);
    const bytes = readFileSync(source.output);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], source.dimensions);
    assert.ok(source.dimensions[0] >= 300 && source.dimensions[1] >= 650, `${source.setId} needs native readable detail`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
    assert.match(source.url, /^https:\/\//);
    assert.match(source.sourceSha256, /^[0-9a-f]{64}$/);
    assert.ok(source.review.length > 40);
  }
});

test('Sun and Moon has 62 verified asset records and 16 connected reverse assets', () => {
  const fronts = JSON.parse(readFileSync('public/packs/pokemon/sm-wrapper-sources.json', 'utf8'));
  const paired = JSON.parse(readFileSync('public/packs/pokemon/sm-paired-sources.json', 'utf8'));
  assert.equal(fronts.length, 62);
  assert.equal(new Set(fronts.map((s: { output: string }) => s.output)).size, 62);
  const backs = paired.filter((s: { side: string }) => s.side === 'back');
  assert.equal(backs.length, 16);
  for (const source of [...fronts, ...backs]) {
    const bytes = readFileSync(source.output);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], source.dimensions);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
    assert.equal(createHash('sha256').update(readFileSync(source.source)).digest('hex'), source.sourceSha256);
    assert.match(source.url, /^https:\/\//);
  }
  for (const back of backs) {
    const boosters = localBoosterArt(back.setId);
    assert.ok(boosters?.length);
    assert.ok(boosters.every(booster => booster.back === `/packs/pokemon/${back.setId}-back.png`));
  }
});
