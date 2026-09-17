import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cards, DIMENSIONS } from '../src/card/CardDefinition.ts';
import { pokemonProfiles } from '../src/materials/profiles/pokemon.ts';
import { parseCardImportManifest } from '../src/assets/CardImportManifest.ts';
import { holographicCardIds } from '../src/pack/PackDefinition.ts';

const card = cards.find(c => c.id === 'pikachu-vmax-vivid-voltage')!;
const bytes = (path: string) => readFileSync(`public${path}`);
const size = (path: string) => { const png=bytes(path); return [png.readUInt32BE(16),png.readUInt32BE(20)]; };

test('Pikachu is the exact English Rainbow Rare print, with unchanged print pixels and shared Pokemon geometry/back', () => {
  assert.equal(card.title, 'Pikachu VMAX'); assert.equal(card.number, '188/185');
  assert.equal(card.set, 'Vivid Voltage · Rainbow Rare');
  assert.equal(card.dimensions, DIMENSIONS.standard);
  assert.equal(card.back, '/cards/pokemon/back.jpg');
  assert.equal(createHash('sha256').update(bytes(card.front)).digest('hex'), '213a853e8e112af0fb9ee8df4fdf55ca731274ccaacee3a743495c3165bee809');
  assert.deepEqual(size(card.front), [734,1024]);
  assert.ok(holographicCardIds.includes(card.id), 'The real foil is eligible in the existing pack pool');
});

test('etched Rainbow Rare maps remain registered at full resolution through the existing import schema', () => {
  const maps = Object.fromEntries(Object.entries(card.maps!).map(([key,path]) => [key,path.split('/').at(-1)]));
  for (const key of ['foil','height','normal','roughness','direction','pattern','protection','laminate','sparkle']) {
    const path = card.maps![key as keyof typeof card.maps]!;
    assert.ok(existsSync(`public${path}`), `Missing ${key}`);
    assert.deepEqual(size(path),[1468,2048],`${key} loses print registration or microetch resolution`);
  }
  const { source: _provenance, ...spec } = card;
  const imported = parseCardImportManifest({ ...spec, front: 'front.png', back: 'back.jpg', maps }, pokemonProfiles);
  assert.equal(imported.number, '188/185');
  assert.deepEqual(imported.maps, maps); assert.deepEqual(imported.mapSettings, card.mapSettings);
  assert.deepEqual(imported.dimensions, DIMENSIONS.standard);
  const profile = pokemonProfiles.find(p=>p.id===card.profile)!;
  assert.equal(profile.structure.field,'plain','Registered surface must not acquire unrelated procedural motifs');
  assert.equal(profile.diffraction.facetCoupling,0,'Authored normal must not be overridden by a generic facet atlas');
  assert.ok(profile.diffraction.strength>0);
});
