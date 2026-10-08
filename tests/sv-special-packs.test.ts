import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { svSpecialRecipes } from '../src/pokemon/SvSpecialRecipes.ts';
import { svTcglCards, svTcglSet } from '../src/pokemon/SvTcglCatalog.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';
import { packAvailability } from '../src/pokemon/availability.ts';
import { replaysForSet } from '../src/pokemon/SvPackReplays.ts';

test('all four special expansions open only their complete exact TCGL pools and ordered eleven-card packs', () => {
  for (const recipe of svSpecialRecipes) {
    const set = svTcglSet(recipe.setId);
    assert.equal(packAvailability(set.id).ready, true);
    assert.equal(set.cardIds.length, recipe.requiredCardIds!.length);
    assert.ok(set.boosters.length > 0);
    for (const booster of set.boosters) assert.ok(existsSync(new URL(`../public${booster.front}`, import.meta.url)));
    for (let seed=0; seed<100; seed++) {
      const pack = collatePokemon(set.id, set.boosters[0].id, seed, svTcglCards);
      assert.equal(pack.pulls.length, 11);
      assert.deepEqual(pack.pulls.map(p=>p.slot.split(':')[0]), ['common','common','common','common','uncommon','uncommon','uncommon','reverse','reverse-replacement','rare','energy']);
      for (const [index,p] of pack.pulls.entries()) {
        assert.ok(index===10 ? p.card.setId==='sve' : set.cardIds.includes(p.card.id));
        assert.ok(p.card.variants.includes(p.variant));
        const definition=pokemonDefinition(p.card,p.variant,[],set.id);
        assert.ok(existsSync(new URL(`../public${definition.front}`,import.meta.url)));
      }
      assert.deepEqual(pack,collatePokemon(set.id,set.boosters[0].id,seed,[...svTcglCards].reverse()));
    }
    assert.throws(()=>collatePokemon(set.id,set.boosters[0].id,1,svTcglCards.filter(c=>c.id!==set.cardIds[0])),/Incomplete/);
  }
});

test('Black Bolt and White Flare Ball foils coexist with second-slot IRs and never include a Trainer Master Ball', () => {
  for (const setId of ['sv10.5b','sv10.5w']) {
    let poke=0,master=0,ir=0,combined=0;
    for(let seed=0;seed<3000;seed++) {
      const p=collatePokemon(setId,'standard',seed,svTcglCards).pulls;
      if(p[7].variant==='pokeball-reverse') poke++;
      if(p[7].variant==='masterball-reverse') {master++;assert.equal(p[7].card.category,'Pokemon');}
      if(p[8].card.rarity==='Illustration Rare') {ir++;if(p[7].variant.endsWith('ball-reverse'))combined++;}
      assert.notEqual(p[8].variant,'masterball-reverse');
      assert.notEqual(p[8].variant,'pokeball-reverse');
      assert.ok(Number(p[10].card.localId)>=17 && Number(p[10].card.localId)<=24);
    }
    assert.ok(poke>800&&poke<1050,`${setId} Poké Ball ${poke}/3000`);
    assert.ok(master>100&&master<210,`${setId} Master Ball ${master}/3000`);
    assert.ok(ir>400&&ir<580,`${setId} IR ${ir}/3000`);
    assert.ok(combined>100);
  }
});

test('Paldean Fates shiny tiers occupy only the first reverse slot and can coexist with second-slot hits', () => {
  const seen=new Set<string>();let combined=0;
  for(let seed=0;seed<1000;seed++) {
    const p=collatePokemon('sv04.5','standard',seed,svTcglCards).pulls;
    if(p[7].card.rarity.startsWith('Shiny')) {seen.add(p[7].card.rarity);if(p[8].variant==='holo')combined++;}
    assert.ok(!p[8].card.rarity.startsWith('Shiny'));
  }
  assert.deepEqual([...seen].sort(),['Shiny Rare','Shiny Ultra Rare']);assert.ok(combined>0);
});

test('verified White Flare God pack replay has fixed observed prints and separate identity from random packs', () => {
  const replay=replaysForSet('sv10.5w')[0];
  const pack=collatePokemon('sv10.5w','reshiram',1,svTcglCards,replay);
  assert.deepEqual(pack.pulls.map(p=>p.card.id),[104,139,154,87,151,96,111,156,133,165].map(n=>`sv10.5w-${String(n).padStart(3,'0')}`).concat(['sve-24-ph']));
  assert.equal(pack.pulls.at(-1)!.variant,'reverse');
  assert.deepEqual(pack.pulls,collatePokemon('sv10.5w','reshiram',2,svTcglCards,replay).pulls);
  assert.notEqual(pack.recipeId,collatePokemon('sv10.5w','reshiram',1,svTcglCards).recipeId);
  for(const p of pack.pulls) assert.ok(existsSync(new URL(`../public${pokemonDefinition(p.card,p.variant,[],pack.setId).front}`,import.meta.url)));
  assert.throws(()=>collatePokemon('sv10.5b','zekrom',1,svTcglCards,replay),/no validated recipe/);
});
