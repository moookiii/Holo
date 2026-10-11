import test from 'node:test';
import assert from 'node:assert/strict';
import { cards, type CardDefinition } from '../src/card/CardDefinition.ts';
import { nonHoloCards } from '../src/card/NonHoloCards.ts';
import { completePokemonMetadata, tcgdexRarity } from '../src/pokemon/metadata.ts';
import { pokemonFinishTags, pokemonFinishLabel } from '../src/pokemon/finishes.ts';
import { filterCards, GalleryQueryIndex } from '../src/gallery/GalleryQuery.ts';
import { basicEnergyCards } from '../src/pokemon/energy.ts';
import { prismaticEnergyPickerCards } from '../src/pokemon/PrismaticEnergySurfaces.ts';

test('every registered Pokémon trading card has rarity, category and an exact print variant', () => {
  const pokemon = cards.filter(card => card.franchise === 'Pokémon' && !card.construction);
  assert.ok(pokemon.length > 2000);
  for (const card of pokemon) {
    assert.ok(card.pokemon?.rarity, `${card.id}: rarity`);
    assert.ok(card.pokemon?.category, `${card.id}: category`);
    assert.ok(card.pokemon?.variants.includes(card.pokemon.variant), `${card.id}: print variant`);
    assert.ok(pokemonFinishTags(card).length, `${card.id}: finish`);
  }
});

test('archive labels agree with the sourced image identity, retaining the original image and stable ID', () => {
  const exeggutor = nonHoloCards.find(card => card.id === 'common-pokemon-gloom')!;
  assert.equal(exeggutor.title, 'Exeggutor');
  assert.equal(exeggutor.number, '35/64');
  assert.equal(exeggutor.pokemon?.id, 'base2-35');
  assert.equal(exeggutor.pokemon?.rarity, 'Uncommon');
  assert.equal(exeggutor.front, '/cards/non-holo/pokemon/gloom.png');
  const golbat = nonHoloCards.find(card => card.id === 'common-pokemon-geodude')!;
  assert.equal(golbat.title, 'Golbat');
  assert.equal(golbat.number, '34/62');
  assert.equal(golbat.pokemon?.id, 'base3-34');
  assert.ok(filterCards([exeggutor, golbat], { search: 'Exeggutor', rarity: 'Uncommon', finish: 'normal', category: 'Pokemon' }).length === 1);
});

test('metadata enrichment preserves all authored optical resources and is idempotent', () => {
  const legacy = { ...nonHoloCards.find(card => card.id === 'common-pokemon-bulbasaur')!, pokemon: undefined };
  const tagged = completePokemonMetadata(legacy);
  for (const field of ['profile', 'front', 'back', 'maps', 'mapSettings', 'profileOverrides', 'layout', 'substrate'] as const) {
    assert.equal(tagged[field], legacy[field], field);
  }
  assert.equal(completePokemonMetadata(tagged), tagged);
  const fabricated = { ...legacy, id: 'unknown-bulbasaur' };
  assert.equal(completePokemonMetadata(fabricated), fabricated);
  assert.equal(fabricated.pokemon, undefined);
});

test('physical-source finish takes precedence over a provisional material and stamped is not a gold stamp', () => {
  const card = { id: 'sun', franchise: 'Pokémon', set: 'Sun & Moon', number: '1', title: 'Sun', profile: 'pokemon-water-web',
    pokemon: { variant: 'holo', foil: { holo: 'SunPillar' } } } as CardDefinition;
  assert.deepEqual(pokemonFinishTags(card), ['holo', 'foil:sun-pillar']);
  const stamped = { ...card, pokemon: { ...card.pokemon!, foil: { holo: 'Stamped' } } };
  assert.deepEqual(pokemonFinishTags(stamped), ['holo', 'foil:stamped']);
  assert.equal(pokemonFinishLabel('foil:stamped'), 'Stamped foil');
});

test('finish groups distinguish reverse prints, non-holo, Cosmos and authored etched cards', () => {
  const cosmos = cards.find(card => card.profile === 'pokemon-base-set-2-cosmos')!;
  const etched = cards.find(card => card.id === 'pikachu-vmax-vivid-voltage')!;
  const reverse = cards.find(card => card.id === 'squirtle-frlg-reverse')!;
  const normal = nonHoloCards.find(card => card.id === 'common-pokemon-bulbasaur')!;
  const index = new GalleryQueryIndex([cosmos, etched, reverse, normal]);
  assert.deepEqual(index.filter({ search: '', finish: 'foil:cosmos' }).map(card => card.id), [cosmos.id]);
  assert.deepEqual(index.filter({ search: '', finish: 'foil:etched' }).map(card => card.id), [etched.id]);
  assert.deepEqual(index.filter({ search: '', finish: 'reverse' }).map(card => card.id), [reverse.id]);
  assert.equal(index.filter({ search: '', finish: 'holo' }).length, 3);
  assert.equal(index.filter({ search: '', finish: 'regular-holo' }).length, 2);
  assert.equal(index.filter({ search: '', finish: 'normal' }).length, 1);
});

test('absent or unmarked TCGdex rarity is explicit and never inferred from foil', () => {
  assert.equal(tcgdexRarity(undefined), 'Unmarked');
  assert.equal(tcgdexRarity('None'), 'Unmarked');
  assert.equal(tcgdexRarity('Hyper rare'), 'Hyper Rare');
});

test('all eight shared SVE Energy prints and Prismatic reverses expose their TCGdex Energy category', () => {
  assert.equal(basicEnergyCards.length, 8);
  for (const card of basicEnergyCards) {
    assert.equal(card.category, 'Energy');
    assert.equal(card.energyType, 'Normal');
  }
  assert.equal(filterCards(prismaticEnergyPickerCards(), { search: '', category: 'Energy', finish: 'reverse' }).length, 8);
});
