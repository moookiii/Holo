import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SOUTHERN_ISLANDS_ID, southernIslandsCards, southernIslandsSet } from '../src/pokemon/SouthernIslandsCatalog.ts';
import { southernIslandsDefinitions } from '../src/card/SouthernIslandsCards.ts';
import { collectionProductFor, resolvePokemonCollection } from '../src/pokemon/CollectionProducts.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';
import { cards } from '../src/card/CardDefinition.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { recipeFor } from '../src/pokemon/recipes.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { packAvailability } from '../src/pokemon/availability.ts';

test('Southern Islands resolves its API ID and retains all 18 English master fronts',()=>{
  const discovery=JSON.parse(readFileSync('public/cards/pokemon/southern-islands/set-discovery.json','utf8'));
  assert.equal(SOUTHERN_ISLANDS_ID,discovery.match.id);
  assert.equal(discovery.match.name,'Southern Islands');
  assert.equal(southernIslandsCards.length,18);
  assert.deepEqual(southernIslandsCards.map(c=>c.name),['Mew','Pidgeot','Onix','Togepi','Ivysaur','Raticate','Ledyba','Jigglypuff','Butterfree','Tentacruel','Marill','Lapras','Exeggutor','Slowking','Wartortle','Lickitung','Vileplume','Primeape']);
  for(const source of JSON.parse(readFileSync('public/cards/pokemon/southern-islands/sources.json','utf8')))
    assert.equal(createHash('sha256').update(readFileSync(`public/cards/pokemon/southern-islands/${source.file}`)).digest('hex'),source.sha256);
});
test('Southern Islands preserves actual reverse/normal variants and exact authored treatments',()=>{
  assert.equal(southernIslandsDefinitions.length,18);
  assert.deepEqual(southernIslandsCards.filter(c=>c.variants.includes('reverse')).map(c=>c.id),['si1-1','si1-4','si1-7','si1-11','si1-14','si1-17']);
  for(const card of southernIslandsCards){
    const d=pokemonDefinition({...card,name:'Renamed'},card.variants[0],cards);
    assert.equal(d.pokemon!.id,card.id);assert.equal(d.proceduralFoil,undefined);
    assert.ok(existsSync(`public${d.front}`));
    if(card.variants[0]==='reverse'){
      assert.equal(d.profile,'pokemon-base-set-2-cosmos');assert.equal(d.mapSettings?.embossStrength,0);
      for(const path of Object.values(d.maps!)){
        assert.ok(path.endsWith('.png'));const b=readFileSync(`public${path}`);
        assert.equal(b.readUInt32BE(16),1200);assert.equal(b.readUInt32BE(20),1650);
      }
    }else{assert.equal(d.profile,'print-only');assert.equal(d.maps,undefined);}
  }
});
test('fixed folder always contains every original print, never a booster recipe or random distribution',()=>{
  const product=collectionProductFor(SOUTHERN_ISLANDS_ID)!;
  assert.equal(product.kind,'collection-folder');assert.ok(existsSync(`public${product.artwork}`));
  const expected=resolvePokemonCollection(product,southernIslandsCards);
  assert.deepEqual(resolvePokemonCollection(product,[...southernIslandsCards].reverse()),expected);
  assert.equal(expected.length,18);assert.equal(new Set(expected.map(c=>c.id)).size,18);
  assert.equal(recipeFor(SOUTHERN_ISLANDS_ID),undefined);assert.deepEqual(southernIslandsSet.boosters,[]);
  assert.throws(()=>collatePokemon(SOUTHERN_ISLANDS_ID,'folder',42,southernIslandsCards),/no validated recipe/);
  assert.throws(()=>resolvePokemonCollection(product,southernIslandsCards.slice(1)),/Incomplete/);
  assert.throws(()=>resolvePokemonCollection(product,[...southernIslandsCards.slice(1),southernIslandsCards[1]]),/Incomplete/);
  assert.ok(packAvailability(SOUTHERN_ISLANDS_ID).ready);
});
test('Southern Islands serves metadata locally and rejects cross-set IDs',async()=>{
  const adapter=new TcgdexAdapter(),signal=new AbortController().signal;
  const set=await adapter.set(SOUTHERN_ISLANDS_ID,signal);
  assert.deepEqual(set,southernIslandsSet);
  for(const c of southernIslandsCards)assert.deepEqual(await adapter.card(c.id,set,signal),{...c,foil:{...c.foil}});
  await assert.rejects(adapter.card('neo2-1',set,signal),/does not belong/);
});
