import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { baseSetCards } from '../src/card/BaseSetCards.ts';
import { jungleDefinitions } from '../src/card/JungleCards.ts';
import { labelRegisteredStars } from '../src/materials/patterns/RegisteredStars.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';

test('all 32 WotC holos have distinct full-front PNG star maps, including pack pulls', () => {
  const definitions = [...baseSetCards, ...jungleDefinitions.filter(c => c.profile === 'pokemon-base-set-star')];
  assert.equal(definitions.length, 32);
  const hashes = new Set<string>();
  for (const card of definitions) {
    assert.match(card.maps!.motif!, /stars\.png$/);
    const bytes = readFileSync(`public${card.maps!.motif}`);
    assert.equal(bytes.readUInt32BE(16), 1200);
    assert.equal(bytes.readUInt32BE(20), 1650);
    hashes.add(createHash('sha256').update(bytes).digest('hex'));
    if (card.pokemon) assert.equal(pokemonDefinition(card.pokemon, 'holo', []).maps?.motif, card.maps!.motif);
  }
  assert.equal(hashes.size, 32, 'different scans must not share a scattered star pattern');
  assert.ok(jungleDefinitions.filter(c => c.profile === 'print-only').every(c => !c.maps?.motif));
});

test('Electrode registers all eight printed stars, including its lower-right star', () => {
  const placements = JSON.parse(readFileSync('scripts/wotc/star-placements.json', 'utf8'));
  assert.equal(Object.keys(placements).length, 32);
  assert.equal(placements['base2-2'].length, 8);
  assert.ok(placements['base2-2'].some(([x,y]: number[]) => x === 500 && y === 374));
});

test('Jolteon includes the faint upper-left and clipped middle-left stars', () => {
  const placements = JSON.parse(readFileSync('scripts/wotc/star-placements.json', 'utf8'));
  for (const [x,y] of [[96,147],[72,300]]) {
    assert.ok(placements['base2-4'].some(([sx,sy]: number[]) => sx === x && sy === y));
  }
});

test('each connected star shares an optical identity across cell boundaries and diagonal rays', () => {
  const data = new Uint8Array(20*20);
  for (let k=2; k<12; k++) data[k*20+k] = 255;
  data[17*20+3] = 255;
  const labels = labelRegisteredStars({width:20,height:20,data});
  assert.ok(labels[2*20+2] > 0);
  assert.equal(labels[2*20+2], labels[11*20+11]);
  assert.notEqual(labels[17*20+3], labels[2*20+2]);
  assert.equal(labels[0], 0);
});
