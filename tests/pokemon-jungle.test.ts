import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { jungleCards, jungleSet } from '../src/pokemon/JungleCatalog.ts';
import { jungleDefinitions, jungleHoloProfile, jungleReadyHolos } from '../src/card/JungleCards.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';
import { packAvailability } from '../src/pokemon/availability.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';

test('Jungle has 64 exact numbered prints, four equal rarity pools and original local fronts', () => {
  assert.equal(jungleCards.length, 64);
  assert.deepEqual(jungleCards.map(card => card.id), Array.from({ length: 64 }, (_, i) => `base2-${i + 1}`));
  assert.deepEqual(['Holo Rare', 'Rare', 'Uncommon', 'Common'].map(rarity => jungleCards.filter(card => card.rarity === rarity).length), [16, 16, 16, 16]);
  assert.equal(jungleCards[63].name, 'Poké Ball');
  const sources = JSON.parse(readFileSync('public/cards/pokemon/jungle/sources.json', 'utf8'));
  for (const [i, card] of jungleCards.entries()) {
    assert.deepEqual(card.variants, [i < 16 ? 'holo' : 'normal']);
    assert.notEqual(card.category, 'Energy');
    const bytes = readFileSync(`public${card.front}`);
    assert.equal(bytes.readUInt32BE(16), 600); assert.equal(bytes.readUInt32BE(20), 825);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), sources[i].sha256);
    if (i < 16) {
      assert.equal(card.name, jungleCards[i + 16].name);
      assert.notEqual(card.front, jungleCards[i + 16].front);
      assert.notEqual(sources[i].sha256, sources[i + 16].sha256);
    }
  }
});

test('Jungle packs have seven unique commons, three unique uncommons and exactly one rare outcome', () => {
  const seen = new Set<string>(); let holos = 0;
  for (let seed = 0; seed < 3000; seed++) {
    const pack = collatePokemon('base2', 'flareon', seed, jungleCards);
    assert.equal(pack.pulls.length, 11);
    assert.ok(pack.pulls.slice(0, 7).every(p => p.card.rarity === 'Common' && p.variant === 'normal'));
    assert.ok(pack.pulls.slice(7, 10).every(p => p.card.rarity === 'Uncommon' && p.variant === 'normal'));
    assert.equal(new Set(pack.pulls.map(p => p.card.id)).size, 11);
    assert.ok(pack.pulls.every(p => p.card.setId === 'base2' && p.card.category !== 'Energy' && p.variant !== 'reverse'));
    const rare = pack.pulls[10];
    assert.equal(rare.slot, 'rare:1');
    assert.equal(rare.variant, Number(rare.card.localId) <= 16 ? 'holo' : 'normal');
    assert.ok(Number(rare.card.localId) <= 32);
    if (rare.variant === 'holo') holos++;
    pack.pulls.forEach(p => seen.add(p.card.id));
    assert.deepEqual(pack.pulls, collatePokemon('base2', 'scyther', seed, [...jungleCards].reverse()).pulls);
    assert.equal(pack.identity, collatePokemon('base2', 'flareon', seed, jungleCards).identity);
  }
  assert.equal(seen.size, 64);
  assert.ok(holos > 900 && holos < 1100, `Estimated 1/3 holo rate: ${holos}/3000`);
  assert.throws(() => collatePokemon('base2', 'unknown', 1, jungleCards), /booster/);
  for (const number of [1, 17, 33, 49]) assert.throws(() => collatePokemon('base2', 'flareon', 1, jungleCards.filter(c => c.localId !== String(number))), /Incomplete/);
});

test('supplied Jungle cutouts activate only their exact holo prints; the remaining holos stay deferred', () => {
  assert.equal(jungleHoloProfile, 'pokemon-base-set-star');
  assert.equal(jungleDefinitions.length, 64);
  assert.equal(packAvailability('base2').ready, true);
  for (const card of jungleCards) {
    const variant = card.variants[0];
    const definition = pokemonDefinition(card, variant, []);
    const ready = variant === 'holo' && jungleReadyHolos.has(card.localId);
    assert.equal(definition.id, `pokemon:${card.id}:${variant}`);
    assert.equal(definition.front, card.front);
    assert.equal(definition.profile, ready ? jungleHoloProfile : 'print-only');
    assert.equal(definition.proceduralFoil, undefined);
    if (ready) {
      for (const role of ['foil', 'protection', 'laminate'] as const) {
        const file = definition.maps?.[role]; assert.ok(file?.endsWith('.png'));
        const bytes = readFileSync(`public${file}`);
        assert.equal(bytes.readUInt32BE(16), 1200); assert.equal(bytes.readUInt32BE(20), 1650);
      }
      assert.equal(definition.maps?.height, undefined);
    } else assert.equal(definition.maps, undefined);
    assert.equal(definition.pokemon?.treatmentStatus, variant === 'holo' && !ready ? 'deferred' : undefined);
    assert.throws(() => pokemonDefinition(card, variant === 'holo' ? 'normal' : 'holo', []), /Invalid/);
  }
});

test('Jungle has three supplied wrapper fronts and a shared back; catalog loads without network calls', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network dependency'); });
  const catalog = new TcgdexAdapter(), signal = new AbortController().signal;
  const set = await catalog.set('base2', signal);
  assert.deepEqual(set, jungleSet);
  assert.deepEqual(set.boosters.map(b => b.id), ['flareon', 'scyther', 'wigglytuff']);
  for (const booster of set.boosters) {
    assert.ok(booster.front && existsSync(`public${booster.front}`));
    assert.equal(booster.back, '/packs/pokemon/base2-back.png');
    assert.ok(existsSync(`public${booster.back}`));
  }
  assert.equal((await catalog.cards(set, signal)).length, 64);
  await assert.rejects(catalog.card('base1-1', set, signal), /Unknown Jungle/);
});
