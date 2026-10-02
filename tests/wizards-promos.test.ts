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
  assert.deepEqual(wizardsPromoSet.cardIds, [...expected, 2, 3, 4, 5, 9, 10, 11, 13, 15, 17, 18, 24, 33, 34, 35, 50, 51, 52, 53]
    .sort((a, b) => a-b).map(number => `basep-${number}`).concat('basep-ancient-mew'));
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
  assert.equal(wizardsPromoDefinitions.length, expected.length + 19);
  for (const [index, definition] of wizardsPromoDefinitions.filter(card => expected.includes(Number(card.pokemon?.localId))).entries()) {
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
  for (const number of [18, 33, 50, 51, 52, 53]) {
    const promo = await catalog.card(`basep-${number}`, set, signal);
    assert.equal(promo.variants[0], 'normal');
    assert.deepEqual(promo.boosterIds, []);
    const definition = wizardsPromoDefinitions.find(card => card.id === `pokemon:basep-${number}:normal`);
    assert.equal(definition?.profile, 'print-only');
    assert.equal(definition?.maps, undefined);
  }
  assert.equal((await catalog.card('basep-ancient-mew', set, signal)).name, 'Ancient Mew');
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

 test('nine authored holo promos retain TCGdex fronts and separate PNG maps',()=>{
 const sources=JSON.parse(readFileSync('public/cards/pokemon/wizards-promos/holo-sources.json','utf8'));
 for(const n of [9,10,11,13,15,17,24,34,35]){
 const c=wizardsPromoDefinitions.find(c=>c.id===`pokemon:basep-${n}:holo`)!;
 assert.ok(c);assert.equal(c.profile,'pokemon-base-set-2-cosmos');assert.equal(c.pokemon?.variant,'holo');
 assert.equal(createHash('sha256').update(readFileSync(`public${c.front}`)).digest('hex'),sources.find(s=>s.id===`basep-${n}`).sha256);
 for(const path of Object.values(c.maps!)){const b=readFileSync(`public${path}`);assert.equal(b.readUInt32BE(16),1200);assert.equal(b.readUInt32BE(20),1650);}
 }
 });
