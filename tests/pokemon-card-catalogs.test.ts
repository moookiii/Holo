import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { myFirstBattleCards, myFirstBattleSet } from '../src/pokemon/MyFirstBattleCatalog.ts';
import { svTcglCards } from '../src/pokemon/SvTcglCatalog.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';

test('non-booster SV catalogs preserve every selectable printing and resolve its own authored front', () => {
  for (const setId of ['svp', 'svalt', 'sve']) {
    const cards = svTcglCards.filter(card => card.setId === setId);
    assert.ok(cards.length > 0);
    const ids = new Set<string>();
    for (const card of cards) for (const variant of card.variants) {
      const definition = pokemonDefinition(card, variant, []);
      assert.equal(definition.pokemon?.id, card.id);
      assert.equal(definition.pokemon?.variant, variant);
      assert.ok(existsSync(new URL(`../public${definition.front}`, import.meta.url)), definition.front);
      assert.ok(!ids.has(definition.id), definition.id); ids.add(definition.id);
    }
  }
});
test('My First Battle catalog opens all 34 sourced cards with nonfoil surfaces and its actual product back', () => {
  assert.equal(myFirstBattleCards.length, 34);
  assert.deepEqual(myFirstBattleSet.cardIds, myFirstBattleCards.map(card => card.id));
  assert.deepEqual(myFirstBattleSet.boosters, []);
  for (const card of myFirstBattleCards) {
    const definition = pokemonDefinition(card, 'normal', []);
    assert.equal(definition.profile, 'print-only');
    assert.equal(definition.proceduralFoil, undefined);
    assert.ok(existsSync(new URL(`../public${definition.front}`, import.meta.url)));
    assert.ok(existsSync(new URL(`../public${definition.back}`, import.meta.url)));
    assert.throws(() => pokemonDefinition(card, 'holo', []), /no foil/);
  }
});
