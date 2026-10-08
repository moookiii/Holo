import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { basicEnergyCards } from '../src/pokemon/energy.ts';
import { pokemonDefinition, pokemonProfile } from '../src/pokemon/materials.ts';
import { isSvTcglCard, svTcglCards } from '../src/pokemon/SvTcglCatalog.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';
import { pokemon151Cards } from '../src/pokemon/Pokemon151Catalog.ts';
import { prismaticCards } from '../src/pokemon/PrismaticCatalog.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonRecipes } from '../src/pokemon/recipes.ts';

test('shared pack Energy keeps its own front and normal/Cosmos finishes alongside the TCGL Energy catalog', () => {
  for (const card of basicEnergyCards) {
    assert.equal(isSvTcglCard(card.id), false);
    for (const variant of card.variants) {
      const definition = pokemonDefinition(card, variant, []);
      assert.equal(definition.front, card.front);
      assert.equal(definition.pokemon?.id, card.id);
      assert.equal(definition.profile, variant === 'normal' ? 'print-only' : 'pokemon-cosmos');
      assert.equal(pokemonProfile(card, variant), definition.profile);
      assert.ok(existsSync(new URL(`../public${definition.front}`, import.meta.url)));
      if (variant === 'holo') assert.equal(definition.maps?.foil, '/cards/pokemon/energy/sv-artwork-mask.png');
    }
  }
});

test('every supported SV pack resolves its shared Energy, including 151 holo and Prismatic reverse', () => {
  const pool = [...svTcglCards, ...pokemon151Cards, ...prismaticCards];
  const seen = new Set<string>();
  for (const recipe of pokemonRecipes.filter(recipe => recipe.era === 'sv')) {
    for (let seed = 0; seed < 100; seed++) {
      const pack = collatePokemon(recipe.setId, 'standard', seed, pool);
      for (const pull of pack.pulls.filter(pull => pull.card.setId === 'sve')) {
        const definition = pokemonDefinition(pull.card, pull.variant, [], pack.setId);
        assert.equal(definition.pokemon?.id, pull.card.id);
        assert.equal(definition.pokemon?.variant, pull.variant);
        assert.equal(definition.front, pull.card.front);
        assert.ok(existsSync(new URL(`../public${definition.front}`, import.meta.url)));
        if (pull.variant === 'reverse') {
          assert.equal(pack.setId, 'sv08.5');
          assert.match(definition.maps!.foil!, /prismatic-evolutions\/tcgl\/energy-\d-reverse-foil\.png$/);
        }
        seen.add(`${pack.setId}:${pull.variant}`);
      }
    }
    assert.ok(seen.has(`${recipe.setId}:normal`), recipe.setId);
  }
  assert.ok(seen.has('sv03.5:holo'));
  assert.ok(seen.has('sv08.5:reverse'));
});

test('exact TCGL Energy print IDs still resolve through their authored TCGL definitions', () => {
  for (const card of svTcglCards.filter(card => card.setId === 'sve')) {
    assert.equal(isSvTcglCard(card.id), true);
    for (const variant of card.variants) {
      const expected = svTcglDefinition(card.id, variant);
      assert.deepEqual(pokemonDefinition(card, variant, []), expected);
      assert.equal(pokemonProfile(card, variant), expected.profile);
    }
  }
});
