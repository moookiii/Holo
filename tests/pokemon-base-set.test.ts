import test from 'node:test';
import assert from 'node:assert/strict';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { recipeFor } from '../src/pokemon/recipes.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';
import { localBoosterArt } from '../src/pokemon/boosterArt.ts';
import { cards as authoredCards } from '../src/card/CardDefinition.ts';
import type { PokemonCard, PrintVariant } from '../src/pokemon/types.ts';

function card(id: string, rarity: string, category: string, variants: PrintVariant[], energyType?: string): PokemonCard {
  return { id, localId: id.split('-')[1], name: id, setId: 'base1', setName: 'Base Set',
    seriesId: 'base', seriesName: 'Base', era: 'base', rarity, category, energyType, variants };
}
const pool = [
  ...Array.from({ length: 8 }, (_, i) => card(`base1-${43 + i}`, 'Common', 'Pokemon', ['normal'])),
  ...Array.from({ length: 6 }, (_, i) => card(`base1-${97 + i}`, 'Common', 'Energy', ['normal'], 'Normal')),
  card('base1-96', 'Uncommon', 'Energy', ['normal'], 'Special'),
  ...Array.from({ length: 6 }, (_, i) => card(`base1-${23 + i}`, 'Uncommon', 'Pokemon', ['normal'])),
  card('base1-17', 'Rare', 'Pokemon', ['normal']), card('base1-70', 'Rare', 'Trainer', ['normal']),
  card('base1-4', 'Holo Rare', 'Pokemon', ['holo']), card('base1-1', 'Holo Rare', 'Pokemon', ['holo']),
  card('base1-8', 'Holo Rare', 'Pokemon', ['holo']),
];

test('Base Set has its own audited eleven-card recipe and three real local wrappers', () => {
  const recipe = recipeFor('base1')!;
  assert.equal(recipe.era, 'base'); assert.equal(recipe.version, '1');
  assert.deepEqual(recipe.slots.map(s => [s.id, s.count]), [['common', 5], ['energy', 2], ['uncommon', 3], ['rare', 1]]);
  const boosters = localBoosterArt('base1');
  assert.deepEqual(boosters?.map(b => b.id), ['blastoise', 'charizard', 'venusaur']);
  assert.equal(boosters?.find(b => b.id === 'venusaur')?.front?.endsWith('/base1-venusaur.png'), true);
  assert.ok(boosters?.every(b => b.back?.endsWith('/base1-back.jpg')));
});
test('Base Set collation separates in-set Basic Energy, special Energy, non-holo rares and holo rares', () => {
  let holos = 0, charizardSeed: number | undefined;
  for (let seed = 0; seed < 3000; seed++) {
    const pack = collatePokemon('base1', 'blastoise', seed, pool);
    assert.equal(pack.pulls.length, 11);
    assert.deepEqual(pack.pulls.map(p => p.slot.split(':')[0]), [
      ...Array(5).fill('common'), ...Array(2).fill('energy'), ...Array(3).fill('uncommon'), 'rare']);
    assert.ok(pack.pulls.every(p => p.card.setId === 'base1' && p.variant !== 'reverse'));
    assert.ok(pack.pulls.slice(0, 5).every(p => p.card.category !== 'Energy' && p.variant === 'normal'));
    assert.ok(pack.pulls.slice(5, 7).every(p => p.card.category === 'Energy' && p.card.energyType === 'Normal' && p.variant === 'normal'));
    assert.ok(pack.pulls.slice(7, 10).every(p => p.card.rarity === 'Uncommon' && p.variant === 'normal'));
    const rare = pack.pulls[10];
    assert.ok(['Rare', 'Holo Rare'].includes(rare.card.rarity));
    assert.equal(rare.variant, rare.card.rarity === 'Holo Rare' ? 'holo' : 'normal');
    assert.notEqual(rare.card.id, 'base1-8', 'starter-deck Machamp cannot appear in boosters');
    if (rare.variant === 'holo') holos++;
    if (rare.card.id === 'base1-4') charizardSeed ??= seed;
    assert.deepEqual(pack.pulls, collatePokemon('base1', 'charizard', seed, [...pool].reverse()).pulls);
  }
  assert.ok(holos > 900 && holos < 1100, `encoded 1/3 holo rate yielded ${holos}/3000`);
  assert.notEqual(charizardSeed, undefined);
  const charizard = collatePokemon('base1', 'venusaur', charizardSeed!, pool).pulls[10];
  const authored = authoredCards.find(c => c.id === 'charizard-base-set')!;
  const definition = pokemonDefinition(charizard.card, charizard.variant, authoredCards);
  assert.equal(definition.profile, authored.profile); assert.deepEqual(definition.maps, authored.maps);
  assert.equal(definition.front, 'https://assets.tcgdex.net/en/base/base1/4/high.png');
  assert.equal(definition.source?.image, 'https://assets.tcgdex.net/en/base/base1/4/high.png');
  const other = pokemonDefinition(pool.find(c => c.id === 'base1-1')!, 'holo', authoredCards);
  assert.equal(other.profile, 'pokemon-base-set-star'); assert.equal(other.proceduralFoil, undefined);
  assert.equal(other.maps?.foil, '/cards/pokemon/base-set/alakazam/foil.png');
  assert.equal(pokemonDefinition(pool[0], 'normal', authoredCards).profile, 'print-only');
});
test('missing required Base Set pools fail instead of changing odds', () => {
  for (const missing of [
    pool.filter(c => !(c.category === 'Energy' && c.energyType === 'Normal')),
    pool.filter(c => c.rarity !== 'Holo Rare'),
    pool.filter(c => c.rarity !== 'Rare'),
    pool.filter(c => c.rarity !== 'Uncommon'),
    pool.filter(c => c.category === 'Energy' || c.rarity !== 'Common'),
  ]) assert.throws(() => collatePokemon('base1', 'blastoise', 1, missing), /Incomplete/);
});
