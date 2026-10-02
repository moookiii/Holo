import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { legendaryCollectionCards, legendaryCollectionSet } from '../src/pokemon/LegendaryCollectionCatalog.ts';
import { legendaryCollectionDefinitions, legendaryCollectionReusedHoloMaps } from '../src/card/LegendaryCollectionCards.ts';
import { legendaryCollectionRecipe } from '../src/pokemon/LegendaryCollectionProduct.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonCatalog } from '../src/pokemon/TcgdexAdapter.ts';
import { wotcPrinting } from '../src/card/WotcCards.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';
import { filterCards } from '../src/gallery/GalleryQuery.ts';
import { packAvailability } from '../src/pokemon/availability.ts';

test('LC retail checklist and independent print definitions are complete', () => {
  assert.deepEqual(legendaryCollectionCards.map(card => card.id), Array.from({ length: 110 }, (_, i) => `lc-${i+1}`));
  assert.equal(legendaryCollectionSet.releaseDate, '2002-05-24');
  assert.deepEqual(legendaryCollectionSet.series, { id: 'lc', name: 'Legendary Collection' });
  assert.deepEqual(['Holo Rare', 'Rare', 'Uncommon', 'Common'].map(r => legendaryCollectionCards.filter(c => c.rarity === r).length), [19, 19, 36, 36]);
  assert.equal(legendaryCollectionDefinitions.length, 220);
  assert.equal(new Set(legendaryCollectionDefinitions.map(d => d.id)).size, 220);
  for (const card of legendaryCollectionCards) {
    const regular = Number(card.localId) <= 19 ? 'holo' : 'normal';
    assert.deepEqual(card.variants, [regular, 'reverse']);
    for (const variant of card.variants) {
      const definition = wotcPrinting(card.id, variant);
      assert.ok(definition, `${card.id}:${variant}`);
      assert.equal(pokemonDefinition(card, variant, legendaryCollectionDefinitions).pokemon?.variant, variant);
      assert.equal(definition.pokemon?.rarity, card.rarity);
      assert.ok(existsSync(`public${definition.front}`), definition.front);
    }
  }
  for (const id of [3, 4, 7]) assert.deepEqual(legendaryCollectionCards[id-1].variants, ['holo', 'reverse']);
});

test('LC holo cutouts reuse registered source paths and two traced subjects use LC-only PNGs', () => {
  assert.equal(Object.keys(legendaryCollectionReusedHoloMaps).length, 17);
  for (const [number, maps] of Object.entries(legendaryCollectionReusedHoloMaps)) {
    assert.equal(wotcPrinting(`lc-${number}`, 'holo')?.maps?.foil, `/cards/pokemon/legendary-collection/maps/${number}-registered-foil.png`);
    for (const path of Object.values(maps)) if (path) assert.ok(existsSync(`public${path}`), path);
  }
  for (let number = 1; number <= 19; number++) {
    const motif = wotcPrinting(`lc-${number}`, 'holo')?.maps?.motif;
    assert.equal(motif, `/cards/pokemon/legendary-collection/maps/${number}-holo-stars.png`);
    assert.ok(existsSync(`public${motif}`));
  }
  for (const number of [6, 9]) {
    const definition = wotcPrinting(`lc-${number}`, 'holo')!;
    assert.equal(definition.profile, 'pokemon-base-set-star');
    for (const path of Object.values(definition.maps!)) if (path) {
      assert.match(path, new RegExp(`/legendary-collection/maps/${number}-(?:holo|registered)-.*\\.png$`));
      assert.ok(existsSync(`public${path}`), path);
    }
  }
});

test('every LC reverse protects the illustration with PNG coverage', () => {
  for (const card of legendaryCollectionCards) {
    const reverse = wotcPrinting(card.id, 'reverse')!;
    assert.equal(reverse.profile, 'pokemon-legendary-reverse');
    assert.equal(reverse.coverageMode, 'reverse');
    assert.match(reverse.maps!.reverseFoil!, /\.png$/);
    assert.ok(existsSync(`public${reverse.maps!.reverseFoil}`));
    assert.ok(existsSync(`public${reverse.maps!.protection}`));
  }
  assert.equal(wotcPrinting('lc-74', 'reverse')?.id, 'eevee-legendary-reverse');
  assert.equal(wotcPrinting('lc-74', 'reverse')?.maps?.protection, '/cards/pokemon/legendary-collection/maps/74-reverse-protection.png');
});

test('LC holo rares use artwork-clean fronts only for their reverse prints', () => {
  for (let number = 1; number <= 19; number++) {
    const base = `/cards/pokemon/legendary-collection/${number}`;
    assert.equal(wotcPrinting(`lc-${number}`, 'holo')?.front, `${base}.png`);
    assert.equal(wotcPrinting(`lc-${number}`, 'reverse')?.front, `${base}-reverse.png`);
  }
  for (let number = 20; number <= 110; number++) {
    if (number === 74) continue;
    assert.equal(wotcPrinting(`lc-${number}`, 'reverse')?.front,
      `/cards/pokemon/legendary-collection/${number}.png`);
  }
});

test('LC appears in catalog, gallery and deterministic retail pack flow', async () => {
  const signal = new AbortController().signal;
  assert.deepEqual(await pokemonCatalog.set('lc', signal), legendaryCollectionSet);
  assert.deepEqual(await pokemonCatalog.sets('lc', signal), [{ id: 'lc', name: 'Legendary Collection', logo: legendaryCollectionSet.logo }]);
  assert.equal((await pokemonCatalog.cards(legendaryCollectionSet, signal)).length, 110);
  assert.equal(filterCards(legendaryCollectionDefinitions, { search: '', set: 'Legendary Collection' }).length, 220);
  assert.equal(packAvailability('lc').ready, true);
  assert.equal(legendaryCollectionRecipe.slots.reduce((sum, slot) => sum + slot.count, 0), 11);
  for (const booster of legendaryCollectionSet.boosters) {
    assert.ok(existsSync(`public${booster.front}`));
    assert.ok(existsSync(`public${booster.back}`));
    for (const seed of [0, 1, 2, 100, 0xffffffff]) {
      const pack = collatePokemon('lc', booster.id, seed, legendaryCollectionCards);
      assert.equal(pack.pulls.length, 11);
      assert.deepEqual(pack.pulls.map(p => p.variant), [...Array(6).fill('normal'), ...Array(3).fill('normal'), pack.pulls[9].variant, 'reverse']);
      assert.equal(pack.pulls.filter(p => p.variant === 'reverse').length, 1);
      assert.equal(pack.identity, collatePokemon('lc', booster.id, seed, [...legendaryCollectionCards].reverse()).identity);
    }
  }
  assert.throws(() => collatePokemon('lc', 'unknown', 1, legendaryCollectionCards), /booster/);
  assert.throws(() => collatePokemon('lc', 'mewtwo', 1, legendaryCollectionCards.slice(1)), /Incomplete/);
});
