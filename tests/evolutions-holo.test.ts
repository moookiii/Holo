import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tcglXySurfaces } from '../src/pokemon/data/xy-tcgl.generated.ts';
import { evolutionsSurface, evolutionsHoloNumbers } from '../src/pokemon/EvolutionsSurfaces.ts';
import { xyDefinition, xyProfile } from '../src/pokemon/XySurfaces.ts';
import { getProfile } from '../src/materials/profiles/index.ts';
import { pokemonProfiles } from '../src/materials/profiles/pokemon.ts';

test('only the thirteen exact English standard holo identities receive the hybrid', () => {
  const eligible = tcglXySurfaces.filter(s => evolutionsSurface(s) !== s);
  assert.deepEqual(eligible.map(s => Number(s.cardId.slice(5))).sort((a,b) => a-b), [...evolutionsHoloNumbers]);
  for (const s of tcglXySurfaces) {
    const result = evolutionsSurface(s);
    if (!eligible.includes(s)) { assert.equal(result, s); continue; }
    assert.equal(s.variant, 'holo');
    assert.match(s.tcglVariantId, /_std_RareHolo_Galaxy_Holo$/);
    assert.equal(result.profile, 'pokemon-evolutions-holo');
    assert.equal(result.deferredEffect, null);
    const d = xyDefinition(s.cardId, 'holo');
    assert.equal(xyProfile(s.cardId, 'holo'), result.profile);
    assert.equal(d.profile, result.profile);
    assert.equal(d.pokemon?.treatmentStatus, undefined);
    assert.doesNotMatch(d.number, /pending/);
    assert.equal(d.mapSettings?.roughnessMode, 'profile');
    assert.equal(d.mapSettings?.normalScale, 0);
    assert.equal(d.mapSettings?.embossStrength, 0);
    assert.equal(d.maps?.normal, undefined);
    assert.equal(d.maps?.height, undefined);
    assert.equal(xyDefinition(s.cardId, 'reverse').profile, 'swsh-reverse-energy');
  }
});

test('all completed registrations preserve masters, own sources and full-front PNG maps', () => {
  const dots = new Set<string>(), stars = new Set<string>();
  for (const n of evolutionsHoloNumbers) {
    const d = xyDefinition(`xy12-${n}`, 'holo');
    const e = JSON.parse(readFileSync('public' + d.source!.metadata, 'utf8'));
    assert.deepEqual(e.coordinateDimensions, [600,825]);
    assert.deepEqual(e.outputDimensions, [1200,1650]);
    assert.ok(e.dots.length > 0 && e.stars.length > 0);
    assert.equal(e.physicalReference.cardId, `xy12-${n}`);
    assert.equal(e.normalGeneration, false);
    assert.equal(e.existingOpticsChanged, false);
    for (const [key, path] of Object.entries(d.maps!)) {
      assert.equal(path, e.maps[key]);
      const bytes = readFileSync('public' + path);
      assert.equal(bytes.readUInt32BE(16),1200); assert.equal(bytes.readUInt32BE(20),1650);
      const hash = createHash('sha256').update(bytes).digest('hex');
      assert.equal(hash,e.hashes[key]);
      if (key === 'motif') dots.add(hash);
      if (key === 'secondaryMotif') stars.add(hash);
    }
    for (const [key,source] of Object.entries(e.preservedSources) as [string,{path:string;sha256:string}][]) {
      const path = key === 'front' ? source.path : 'public' + source.path;
      assert.ok(existsSync(path));
      assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),source.sha256);
    }
    assert.equal(d.front, '/' + e.preservedSources.front.path.replace(/^public\//,''));
  }
  assert.equal(dots.size,13); assert.equal(stars.size,13);
});

test('hybrid inherits existing registered optics and disables random sparkle/relief', () => {
  const p = getProfile('pokemon-evolutions-holo');
  const cosmos = pokemonProfiles.find(p => p.id === 'pokemon-base-set-2-cosmos')!;
  const stars = pokemonProfiles.find(p => p.id === 'pokemon-base-set-star')!;
  assert.deepEqual(p.diffraction,cosmos.diffraction);
  assert.deepEqual(p.structure,cosmos.structure);
  assert.deepEqual(p.surface,cosmos.surface);
  assert.deepEqual(p.secondary!.diffraction,stars.diffraction);
  assert.equal(p.secondary!.structure.field,'base-set-star');
  for (const layer of [p,p.secondary!]) {
    assert.equal(layer.glints.strength,0); assert.equal(layer.glints.density,0);
    assert.equal(layer.structure.relief,0); assert.equal(layer.structure.engraving,0);
  }
  assert.notEqual(p.structure,cosmos.structure);
  assert.notEqual(p.secondary!.structure,stars.structure);
  assert.equal(stars.glints.strength,.75);
});
