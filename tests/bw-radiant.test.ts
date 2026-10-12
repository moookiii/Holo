import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tcglBwSurfaces } from '../src/pokemon/data/bw-tcgl.generated.ts';
import { bwRadiantSurface } from '../src/pokemon/BwRadiantSurfaces.ts';
import { bwDefinition, bwProfile } from '../src/pokemon/BwSurfaces.ts';
import { bwRadiantProfiles } from '../src/materials/profiles/bwRadiant.ts';
import { resolvePhysicalCardProfile } from '../src/materials/PhysicalCardProfile.ts';
import type { PrintVariant } from '../src/pokemon/types.ts';

test('all 25 RC finish definitions preserve identity/fronts and load their documented PNGs', () => {
  const cards = tcglBwSurfaces.filter(s => s.cardId.startsWith('bw11r-'));
  assert.equal(cards.length,25);
  assert.equal(cards.filter(s => s.foilType === 'NonFoil').length,10);
  for (const raw of cards) {
    const s = bwRadiantSurface(raw), def = bwDefinition(s.cardId,s.variant as PrintVariant);
    assert.equal(def.profile,bwProfile(s.cardId,s.variant as PrintVariant));
    assert.equal(s.tcglVariantId,raw.tcglVariantId);
    assert.equal(def.pokemon!.treatmentStatus,undefined);
    assert.ok(!def.number!.includes('pending'));
    assert.equal(def.mapSettings!.normalScale,0);
    assert.equal(def.mapSettings!.embossStrength,0);
    assert.equal(resolvePhysicalCardProfile(def).microreliefDepth,0);
    const e = JSON.parse(readFileSync('public'+s.evidence,'utf8'));
    assert.equal(e.tcglVariantId,raw.tcglVariantId);
    assert.equal(e.radiantFinish.frontChanged,false);
    assert.equal(e.radiantFinish.runtimeNormalGeneration,false);
    for (const [kind,url] of Object.entries(s.maps)) {
      assert.ok(url.endsWith('.png'));
      const data = readFileSync('public'+url);
      assert.equal(data.subarray(1,4).toString(),'PNG');
      assert.equal(createHash('sha256').update(data).digest('hex'),e.radiantFinish.outputs[kind].sha256);
    }
    for (const [kind,hash] of Object.entries(e.radiantFinish.sourceHashes)) {
      assert.equal(createHash('sha256').update(readFileSync('public'+raw.originalAssets[kind])).digest('hex'),hash);
    }
    assert.equal(Boolean(s.maps.secondaryFoil),raw.foilType !== 'NonFoil');
    assert.equal(Boolean(s.maps.pattern),raw.foilType === 'NonFoil');
    assert.equal(Boolean(s.maps.normal),false);
    if (raw.foilType === 'NonFoil') assert.match(e.limitations,/approximate/);
  }
});

test('RC finish resolution leaves all other BW source records untouched', () => {
  for (const s of tcglBwSurfaces.filter(s => !s.cardId.startsWith('bw11r-'))) assert.equal(bwRadiantSurface(s),s);
  for (const p of bwRadiantProfiles) {
    for (const layer of [p,p.secondary].filter(Boolean)) {
      assert.equal(layer!.structure.relief,0);
      assert.equal(layer!.structure.engraving,0);
      assert.equal(layer!.structure.facetTilt,0);
    }
  }
  const glitter = bwRadiantProfiles[0];
  assert.ok(glitter.secondary!.glints.scale < glitter.glints.scale);
  assert.equal(glitter.glints.spectralGrain,true);
  assert.equal(glitter.secondary!.glints.spectralGrain,true);
});
