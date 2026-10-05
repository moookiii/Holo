import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SAMPLE_SET_ID, SAMPLE_SET_NAME, sampleSet, sampleSetCards } from '../src/pokemon/SampleSetCatalog.ts';
import { sampleSetDefinitions } from '../src/card/SampleSetCards.ts';
import { cards } from '../src/card/CardDefinition.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { collectionProductFor, resolvePokemonCollection } from '../src/pokemon/CollectionProducts.ts';
import { packAvailability } from '../src/pokemon/availability.ts';
import { recipeFor } from '../src/pokemon/recipes.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { filterCards, compareGallerySetNames } from '../src/gallery/GalleryQuery.ts';

test('audited Sample checklist retains sparse /093 numbering and native exact-print sources', () => {
  assert.deepEqual(sampleSetCards.map(c => [c.localId, c.name]), [
    ['002','Hoppip'],['004','Koffing'],['016','Pikachu'],['019','Gastly'],['021','Machop'],
    ['042','Machoke'],['048','Chansey'],['074','Rapidash'],['083','Pichu'],['088','Machamp'],
  ]);
  const sources = JSON.parse(readFileSync('public/cards/pokemon/sample-set/sources.json', 'utf8'));
  assert.equal(sources.length, 10);
  for (const [i, source] of sources.entries()) {
    const bytes = readFileSync(`public/cards/pokemon/sample-set/${source.file}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
    assert.equal(source.number, sampleSetCards[i].localId + '/093');
    assert.equal(source.name, sampleSetCards[i].name);
    assert.ok(source.width >= 377 && source.width <= 457);
    assert.ok(source.height >= 527 && source.height <= 635);
    assert.equal(source.finish, 'non-holo');
    assert.match(source.url, /SampleSpecial-Print\.jpg$/);
  }
  const evidence = JSON.parse(readFileSync('public/cards/pokemon/sample-set/evidence.json', 'utf8'));
  for (const asset of [evidence.back, evidence.symbol])
    assert.equal(createHash('sha256').update(readFileSync(`public/cards/pokemon/sample-set/${asset.file}`)).digest('hex'), asset.sha256);
});

test('every Sample definition is non-holo and preserves full front and Japanese reverse', () => {
  for (const card of sampleSetCards) {
    const def = pokemonDefinition({ ...card, name: 'Identity test' }, 'normal', []);
    assert.equal(def.title, card.name);
    assert.equal(def.profile, 'print-only');
    assert.equal(def.physicalProfile, 'pokemon');
    assert.equal(def.pokemon!.category, 'Pokemon');
    assert.deepEqual(card.variants, ['normal']);
    assert.deepEqual(card.boosterIds, []);
    assert.equal(def.maps, undefined);
    assert.equal(def.proceduralFoil, undefined);
    assert.equal(def.mapSettings!.embossStrength, 0);
    assert.equal(def.front, card.front);
    assert.ok(existsSync(`public${def.front}`));
    assert.equal(def.back, '/cards/pokemon/sample-set/back-jp.png');
    assert.ok(existsSync(`public${def.back}`));
    assert.equal(def.dimensions.width, 6.3);
    assert.equal(def.dimensions.height, 8.8);
    assert.throws(() => pokemonDefinition(card, 'holo', cards), /Invalid Sample/);
    assert.throws(() => pokemonDefinition(card, 'reverse', cards), /Invalid Sample/);
  }
});

test('demo opening is the complete fixed checklist, never a randomized booster or claimed retail folder', () => {
  const product = collectionProductFor(SAMPLE_SET_ID)!;
  assert.equal(product.kind, 'demonstration-collection');
  assert.match(product.note, /packaging and participant allocation are unknown/i);
  assert.deepEqual(resolvePokemonCollection(product, [...sampleSetCards].reverse()).map(c => c.id), sampleSet.cardIds);
  assert.equal(resolvePokemonCollection(product, sampleSetCards).length, 10);
  assert.equal(recipeFor(SAMPLE_SET_ID), undefined);
  assert.deepEqual(sampleSet.boosters, []);
  assert.throws(() => collatePokemon(SAMPLE_SET_ID, 'standard', 123, sampleSetCards), /no validated recipe/);
  assert.throws(() => resolvePokemonCollection(product, sampleSetCards.slice(1)), /Incomplete/);
  assert.throws(() => resolvePokemonCollection(product, [...sampleSetCards.slice(1), sampleSetCards[1]]), /Incomplete/);
  assert.match(packAvailability(SAMPLE_SET_ID).label, /10 cards/);
});

test('local adapter serves all cards and prevents cross-set and mutable snapshot contamination', async () => {
  const adapter = new TcgdexAdapter(), signal = new AbortController().signal;
  const set = await adapter.set(SAMPLE_SET_ID, signal);
  assert.deepEqual(set, sampleSet);
  assert.deepEqual(await adapter.cards(set, signal), sampleSetCards);
  await assert.rejects(adapter.card('ecard1-112', set, signal), /does not belong/);
  await assert.rejects(adapter.card('sp-002', { ...set, id: 'ecard1' }, signal), /does not belong/);
  assert.equal(sampleSetCards.length, 10);
});

test('gallery supports complete Sample filtering, name/number search and release chronology', () => {
  assert.equal(filterCards(cards, { search: '', set: SAMPLE_SET_NAME }).length, 10);
  assert.equal(filterCards(cards, { search: 'sample 083' })[0].title, 'Pichu');
  assert.equal(filterCards(cards, { search: 'Sample', category: 'Trainer' }).length, 0);
  assert.equal(filterCards(cards, { search: '', set: SAMPLE_SET_NAME, finish: 'holo' }).length, 0);
  assert.equal(filterCards(cards, { search: '', set: SAMPLE_SET_NAME, finish: 'normal', category: 'Pokemon' }).length, 10);
  assert.ok(compareGallerySetNames('Legendary Collection', SAMPLE_SET_NAME) < 0);
  assert.ok(compareGallerySetNames(SAMPLE_SET_NAME, 'Expedition Base Set') < 0);
  assert.ok(sampleSetDefinitions.every(d => cards.some(c => c.id === d.id)));
});
