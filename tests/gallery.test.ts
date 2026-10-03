import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GalleryResidency } from '../src/gallery/GalleryResidency.ts';
import { galleryLayout } from '../src/gallery/GalleryLayout.ts';
import { influence, damp } from '../src/gallery/GalleryMotion.ts';
import { filterCards, gallerySetName } from '../src/gallery/GalleryQuery.ts';
import { baseSetCards } from '../src/card/BaseSetCards.ts';
import { ancientMewCard } from '../src/card/AncientMewCard.ts';
import { nonHoloCards } from '../src/card/NonHoloCards.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';
import type { CardDefinition } from '../src/card/CardDefinition.ts';
import type { PokemonCard, PrintVariant } from '../src/pokemon/types.ts';
import { lobCards } from '../src/yugioh/sets/LegendOfBlueEyesCatalog.ts';
import { yugiohDefinition } from '../src/yugioh/materials.ts';

test('10,000 cards remain inside the slot budget over repeated traversal and resizes', () => {
  const residency = new GalleryResidency(48);
  for (const [width, height] of [[320, 720], [1440, 1100], [3840, 2160], [800, 5000]]) {
    for (let pass = 0; pass < 3; pass++) for (let scroll = 0; scroll < 600000; scroll += 3517) {
      const layout = galleryLayout(width, height, 10000, scroll);
      assert.ok(layout.end - layout.start <= 48);
      const ids = Array.from({ length: layout.end - layout.start }, (_, i) => String(layout.start + i));
      const assigned = residency.reconcile(ids);
      assert.equal(new Set(assigned.map(a => a.slot)).size, ids.length);
      assert.equal(residency.slots.filter(s => s.visible).length, ids.length);
    }
  }
});
test('stale uploads cannot replace an evicted card; recently needed slots survive', () => {
  const residency = new GalleryResidency(2);
  const [a] = residency.reconcile(['a', 'b']);
  residency.reconcile(['b']);
  residency.reconcile(['c']);
  assert.equal(residency.owns(a.slot, a.token), false);
  assert.ok(residency.slots.some(s => s.id === 'b'));
  residency.clear(); assert.equal(residency.owns(a.slot, a.token), false);
});
test('a cursor influences neighboring cards, smoothly returns and respects distance', () => {
  assert.ok(influence(-180, 40).yaw < 0);
  assert.ok(influence(180, 40).yaw > 0);
  assert.ok(influence(0, -180).pitch < 0);
  assert.ok(influence(0, 180).pitch > 0);
  assert.ok(influence(180, 0).yaw > .15);
  assert.ok(influence(300, 0).yaw > 0);
  assert.equal(influence(360, 0).yaw, 0);
  assert.ok(Math.abs(influence(359.99, 0).yaw) < .00001);
  let value = .2;
  for (let i = 0; i < 90; i++) value = damp(value, 0, 1 / 60);
  assert.ok(value < .000001);
});
test('facets intersect with search without inventing missing rarity/category', () => {
  const cards = [
    { id: 'a', title: 'Lugia', set: 'Neo', number: '9', franchise: 'Pokémon', profile: 'holo', pokemon: { rarity: 'Rare', category: 'Pokemon', variant: 'holo' } },
    { id: 'b', title: 'Lugia', set: 'Neo', number: '10', franchise: 'Pokémon', profile: 'print-only' },
    { id: 'c', title: 'Dragon', set: 'Other', number: '1', franchise: 'Yu-Gi-Oh!', profile: 'holo' },
  ] as CardDefinition[];
  assert.deepEqual(filterCards(cards, { search: 'lugia neo', rarity: 'Rare', finish: 'holo' }).map(c => c.id), ['a']);
  assert.equal(filterCards(cards, { search: '', category: 'Pokemon' }).length, 1);
  assert.equal(filterCards(cards, { search: '', game: 'Yu-Gi-Oh!', set: 'Neo' }).length, 0);
  assert.equal(filterCards(cards, { search: '' }).length, 3);
});

test('authored Ancient Mew appears under the Pokémon Holo finish', () => {
  assert.deepEqual(filterCards([ancientMewCard], { search: '', game: 'Pokémon', finish: 'holo' }).map(card => card.id), ['ancient-mew']);
});

test('Yu-Gi-Oh! prints group by release and sort by set then card number', () => {
  const cards = [
    { id: 'oldest', title: 'Dragon', franchise: 'Yu-Gi-Oh!', set: 'User supplied · SDK-style Ultra', number: 'LDK2-ENK0L' },
    { id: 'late', title: 'C', franchise: 'Yu-Gi-Oh!', set: 'CORI-EN061 · Starlight Rare', number: 'CORI-EN061' },
    { id: 'second', title: 'B', franchise: 'Yu-Gi-Oh!', set: 'BLZD-EN024 · Ultra Rare', number: 'BLZD-EN024' },
    { id: 'first', title: 'A', franchise: 'Yu-Gi-Oh!', set: 'BLZD-EN010 · Secret Rare', number: 'BLZD-EN010' },
  ] as CardDefinition[];
  assert.equal(gallerySetName(cards[2]), 'Blazing Dominion');
  assert.deepEqual(filterCards(cards, { search: '', game: 'Yu-Gi-Oh!' }).map(card => card.id), ['oldest', 'first', 'second', 'late']);
  assert.deepEqual(filterCards(cards, { search: '', set: 'Blazing Dominion', rarity: 'Secret Rare' }).map(card => card.id), ['first']);
  assert.deepEqual(filterCards(cards, { search: 'BLZD-EN024' }).map(card => card.id), ['second']);
});

test('the full LOB first edition catalog appears first in the Yu-Gi-Oh! gallery', () => {
  const lob = lobCards.map(yugiohDefinition);
  assert.equal(lob.length, 126);
  assert.equal(new Set(lob.map(gallerySetName)).size, 1);
  assert.equal(gallerySetName(lob[0]), 'Legend of Blue Eyes White Dragon');
  assert.deepEqual(filterCards(lob, { search: '', game: 'Yu-Gi-Oh!', set: 'Legend of Blue Eyes White Dragon' }).map(card => card.number),
    lob.map(card => card.number));
});

test('pack copies of Base Set cards resolve to one gallery master per printing', () => {
  const archive = nonHoloCards.find(card => card.id === 'common-pokemon-bulbasaur')!;
  const authored = baseSetCards.find(card => card.id === 'alakazam-base-set')!;
  const pull = (localId: string, name: string, rarity: string, variant: PrintVariant): PokemonCard => ({
    id: `base1-${localId}`, localId, name, setId: 'base1', setName: 'Base Set',
    seriesId: 'base', seriesName: 'Base', era: 'base', rarity, category: 'Pokemon', variants: [variant],
  });
  const generatedNormal = pokemonDefinition(pull('44', 'Bulbasaur', 'Common', 'normal'), 'normal', [archive, authored]);
  const generatedHolo = pokemonDefinition(pull('1', 'Alakazam', 'Holo Rare', 'holo'), 'holo', [archive, authored]);
  const cards = [generatedNormal, generatedHolo, archive, authored];
  assert.deepEqual(filterCards(cards, { search: '', game: 'Pokémon', set: 'Base Set' }).map(card => card.id),
    ['alakazam-base-set', 'common-pokemon-bulbasaur']);

  const unlimitedHolo: CardDefinition = { ...generatedHolo, id: 'unlimited-alakazam', front: '/different-print.png',
    pokemon: { ...generatedHolo.pokemon!, edition: 'unlimited' } };
  assert.equal(filterCards([...cards, unlimitedHolo], { search: '', set: 'Base Set' }).length, 3);
});
