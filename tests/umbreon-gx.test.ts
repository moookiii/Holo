import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cards } from '../src/card/CardDefinition.ts';
import { pokemonProfiles } from '../src/materials/profiles/pokemon.ts';

test('Umbreon GX uses the TCGdex 154/149 front and independent registered relief', () => {
  const card = cards.find(c => c.id === 'umbreon-gx-sm1-154')!;
  assert.equal(card.number, '154/149');
  assert.equal(card.source?.image, 'https://assets.tcgdex.net/en/sm/sm1/154/high.png');
  const root = 'public/cards/umbreon-gx-sm1-154/';
  const source = JSON.parse(readFileSync(root + 'source.json', 'utf8'));
  for (const [name, hash] of Object.entries(source.maps)) {
    const png = readFileSync(root + name);
    assert.equal(createHash('sha256').update(png).digest('hex'), hash);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], name === 'front.png' ? [600, 825] : [1800, 2475]);
  }
  const profile = pokemonProfiles.find(p => p.id === card.profile)!;
  assert.equal(profile.diffraction.followsAuthoredNormals, true);
  assert.equal(profile.structure.engraving, 0);
  assert.equal(profile.structure.facetTilt, 0);
  assert.equal(profile.glints.strength, 0);
  assert.equal(card.mapSettings?.embossStrength, 0);
  assert.ok(profile.surface.etchedInkSheen! > 0);
  const triangles = JSON.parse(readFileSync('research/umbreon-gx-sm1-154/traced-groove-regions.json', 'utf8')) as { points: [number, number][] }[];
  assert.ok(triangles.length > 300);
  for (const { points } of triangles) {
    const edges = points.map(([x, y], i) => {
      const [xx, yy] = points[(i + 1) % 3];
      return Math.hypot(x - xx, y - yy);
    });
    assert.ok(edges.every(edge => Math.abs(edge - 36) < .01), 'the background repeats congruent triangles');
  }
});
