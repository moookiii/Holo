import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dragonDiscoveryCards, dragonDiscoveryDefinitions, dragonDiscoverySet, dragonDiscoveryDefinition } from '../src/pokemon/DragonDiscoveryCatalog.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { compareGallerySetNames } from '../src/gallery/GalleryQuery.ts';
import { packAvailability } from '../src/pokemon/availability.ts';

test('exact M24EN catalog has seven holo prints, eight non-holos and verifiable local assets', () => {
  assert.equal(dragonDiscoveryCards.length, 15);
  assert.deepEqual(dragonDiscoveryCards.filter(card => card.variants.includes('holo')).map(card => Number(card.localId)), [2,3,8,10,11,12,15]);
  for (const definition of dragonDiscoveryDefinitions) {
    const evidence = JSON.parse(readFileSync('public'+definition.source!.metadata!, 'utf8'));
    assert.equal(evidence.printedSetCode, 'M24EN');
    assert.equal(evidence.variant, definition.pokemon!.variant);
    assert.equal(createHash('sha256').update(readFileSync('public'+definition.front)).digest('hex'), evidence.frontSha256);
    assert.equal(definition.profile, 'print-only');
    assert.equal(definition.pokemon!.treatmentStatus, evidence.variant === 'holo' ? 'deferred' : undefined);
    assert.equal(definition.maps, undefined);
  }
  assert.throws(() => dragonDiscoveryDefinition('2024sv-1', 'holo'), /Invalid/);
  assert.throws(() => dragonDiscoveryDefinition('2024sv-2', 'reverse'), /Invalid/);
  assert.equal(packAvailability('2024sv').ready, true);
});

test('four-card packs use one holo plus three distinct non-holos, never an expansion print or Energy', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 200; seed++) {
    const pack = collatePokemon('2024sv', 'english', seed, dragonDiscoveryCards);
    assert.equal(pack.pulls.length, 4);
    assert.deepEqual(pack.pulls.map(pull => pull.variant), ['holo','normal','normal','normal']);
    assert.equal(new Set(pack.pulls.map(pull => pull.card.id)).size, 4);
    for (const pull of pack.pulls) { assert.equal(pull.card.setId, '2024sv'); seen.add(pull.card.id); }
    assert.equal(pack.identity, collatePokemon('2024sv', 'english', seed, [...dragonDiscoveryCards].reverse()).identity);
  }
  assert.equal(seen.size, 15);
  assert.throws(() => collatePokemon('2024sv', 'english', 0, dragonDiscoveryCards.slice(1)), /Incomplete/);
  assert.throws(() => collatePokemon('2024sv', 'invalid', 0, dragonDiscoveryCards), /no validated recipe/);
});

test('SV discovery inserts the U.S. launch chronologically and exact cards load without network', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return new Response(JSON.stringify({ id: 'sv', name: 'Scarlet & Violet', sets: [{id:'sv09',name:'Journey Together'}, {id:'sv08.5',name:'Prismatic Evolutions'}] }), { headers: {'Content-Type':'application/json'} });
  });
  const adapter = new TcgdexAdapter(), signal = new AbortController().signal;
  const sets = await adapter.sets('sv', signal), index = sets.findIndex(set => set.id === '2024sv');
  assert.ok(index > sets.findIndex(set => set.id === 'sv08.5'));
  assert.ok(index < sets.findIndex(set => set.id === 'sv09'));
  const before = requests, set = await adapter.set('2024sv', signal);
  assert.equal(set.releaseDate, '2025-01-21');
  assert.equal((await adapter.cards(set, signal)).length, 15);
  assert.equal(requests, before);
  await assert.rejects(adapter.card('sv01-025', set, signal), /does not belong/);
  assert.ok(compareGallerySetNames('Prismatic Evolutions', dragonDiscoverySet.name) < 0);
  assert.ok(compareGallerySetNames(dragonDiscoverySet.name, 'Journey Together') < 0);
});
