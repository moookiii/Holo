import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { wizardsPromoCards, wizardsOrdinaryPromoCards, wizardsMoviePromoCards, wizardsPromoSet } from '../src/pokemon/WizardsPromoCatalog.ts';
import { wizardsPromoDefinitions } from '../src/card/WizardsPromoCards.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { recipeFor } from '../src/pokemon/recipes.ts';
import { packAvailability } from '../src/pokemon/availability.ts';

const expected = [1, 6, 7, 8, 12, 14, 16,
  ...Array.from({ length: 5 }, (_, i) => i + 19),
  ...Array.from({ length: 8 }, (_, i) => i + 25),
  ...Array.from({ length: 14 }, (_, i) => i + 36)];

test('phase 1 contains only the approved ordinary Wizards promo numbers and exact PNG fronts', () => {
  assert.deepEqual(wizardsOrdinaryPromoCards.map(card => Number(card.localId)), expected);
  assert.deepEqual(wizardsPromoSet.cardIds, [...expected, 2, 3, 4, 5].sort((a,b) => a-b).map(number => `basep-${number}`));
  assert.equal(wizardsPromoSet.boosters.length, 0);
  const sources = JSON.parse(readFileSync('public/cards/pokemon/wizards-promos/sources.json', 'utf8'));
  for (const [index, card] of wizardsOrdinaryPromoCards.entries()) {
    const front = readFileSync(`public${card.front}`);
    assert.equal(createHash('sha256').update(front).digest('hex'), sources[index].sha256);
    assert.equal(front.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(card.name.length > 0, true);
    assert.equal(card.rarity, 'Promo');
    assert.ok(['Pokemon', 'Trainer'].includes(card.category!));
    assert.deepEqual(card.variants, ['normal']);
    assert.deepEqual(card.boosterIds, []);
  }
});

test('every promo uses the existing plain card viewer and no pack recipe', async () => {
  assert.equal(recipeFor('basep'), undefined);
  assert.equal(packAvailability('basep').ready, false);
  assert.equal(wizardsPromoDefinitions.length, expected.length + 4);
  for (const [index, definition] of wizardsPromoDefinitions.filter(card => card.profile === 'print-only').entries()) {
    assert.equal(definition.id, `pokemon:basep-${expected[index]}:normal`);
    assert.equal(definition.profile, 'print-only');
    assert.equal(definition.pokemon?.variant, 'normal');
    assert.equal(definition.pokemon?.setId, 'basep');
    assert.equal(definition.front, wizardsOrdinaryPromoCards[index].front);
    assert.equal(definition.proceduralFoil, undefined);
    assert.equal(definition.maps, undefined);
  }
  const catalog = new TcgdexAdapter(), signal = new AbortController().signal;
  const set = await catalog.set('basep', signal);
  assert.deepEqual(set, wizardsPromoSet);
  assert.deepEqual(await catalog.cards(set, signal), wizardsPromoCards);
  await assert.rejects(catalog.card('basep-50', set, signal), /Unknown Wizards Black Star Promo/);
  await assert.rejects(catalog.card('basep-18', set, signal), /Unknown Wizards Black Star Promo/);
  await assert.rejects(catalog.card('basep-33', set, signal), /Unknown Wizards Black Star Promo/);
});

test('First Movie subset has four registered gold stamps and no foil coverage', () => {
  assert.deepEqual(wizardsMoviePromoCards.map(card => card.name), ['Electabuzz', 'Mewtwo', 'Pikachu', 'Dragonite']);
  const sources = JSON.parse(readFileSync('public/cards/pokemon/wizards-promos/movie-sources.json', 'utf8'));
  for (const source of sources.cards) {
    const card = wizardsPromoDefinitions.find(card => card.id === `pokemon:basep-${source.number}:normal`)!;
    assert.equal(card.profile, 'pokemon-first-movie-gold');
    assert.deepEqual(card.pokemon?.boosterIds, []);
    assert.deepEqual(Object.keys(card.maps!), ['metallic']);
    assert.equal(card.proceduralFoil, undefined);
    for (const [path, hash] of [[card.front, source.sha256], [card.maps!.metallic!, source.maskSha256]]) {
      const png = readFileSync(`public${path}`);
      assert.equal(createHash('sha256').update(png).digest('hex'), hash);
      assert.equal(png.readUInt32BE(16), 600);
      assert.equal(png.readUInt32BE(20), 825);
    }
  }
});
