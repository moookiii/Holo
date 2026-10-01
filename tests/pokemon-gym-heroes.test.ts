import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gymHeroesCards, gymHeroesSet } from '../src/pokemon/GymHeroesCatalog.ts';
import { gymHeroesDefinitions } from '../src/card/GymHeroesCards.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonDefinition, pokemonProfile } from '../src/pokemon/materials.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { packAvailability } from '../src/pokemon/availability.ts';

test('Gym Heroes preserves all 132 numbered TCGdex fronts and the six Basic Energies', () => {
  assert.deepEqual(gymHeroesCards.map(c=>Number(c.localId)),Array.from({length:132},(_,i)=>i+1));
  const counts: Record<string,number>={};
  for(const c of gymHeroesCards)counts[c.rarity]=(counts[c.rarity]??0)+1;
  assert.deepEqual(counts,{'Holo Rare':19,Rare:23,Uncommon:42,Common:48});
  assert.deepEqual(gymHeroesCards.filter(c=>c.category==='Energy').map(c=>c.localId),['127','128','129','130','131','132']);
  assert.ok(gymHeroesCards.filter(c=>c.category==='Energy').every(c=>c.energyType==='Normal'));
  const sources=JSON.parse(readFileSync('public/cards/pokemon/gym-heroes/sources.json','utf8'));
  assert.equal(sources.length,132);
  for(const s of sources)assert.equal(createHash('sha256').update(readFileSync(`public/cards/pokemon/gym-heroes/${s.file}`)).digest('hex'),s.sha256);
});

test('all 19 Gym Heroes holos resolve PNG masks and registered Cosmos with no procedural fallback',()=>{
  assert.equal(gymHeroesDefinitions.length,132);
  assert.equal(new Set(gymHeroesDefinitions.map(d=>d.id)).size,132);
  for(const d of gymHeroesDefinitions){
    const card=d.pokemon!,resolved=pokemonDefinition(card,card.variant,[]);
    assert.equal(resolved.id,d.id);assert.equal(resolved.front,d.front);
    assert.equal(resolved.number,d.number);assert.match(d.number,/\/132 · 1st Edition/);
    assert.equal(card.edition,'first-edition');
    assert.deepEqual(Object.keys(card.editionFronts!),['first-edition']);
    const holo=Number(card.localId)<=19,profile=holo?'pokemon-base-set-2-cosmos':'print-only';
    assert.equal(resolved.profile,profile);assert.equal(pokemonProfile(card,card.variant),profile);
    assert.equal(resolved.proceduralFoil,undefined);assert.equal(resolved.profileOverrides,undefined);
    if(holo){
      assert.deepEqual(Object.keys(d.maps!).sort(),['foil','motif','protection']);
      assert.equal(d.mapSettings?.embossStrength,0);
      for(const path of Object.values(d.maps!)){
        assert.ok(path.endsWith('.png'));
        const bytes=readFileSync(`public${path}`);
        assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),1650);
      }
    }else assert.equal(d.maps,undefined);
    assert.ok(existsSync(`public${d.front}`));
    assert.equal(d.front,card.editionFronts!['first-edition']);
    assert.throws(()=>pokemonDefinition(card,'reverse',[]),/Invalid/);
  }
});

test('Gym Heroes catalog serves all cards and four first edition wrappers locally',async()=>{
  const catalog=new TcgdexAdapter(),signal=new AbortController().signal,old=globalThis.fetch;
  globalThis.fetch=async()=>{throw Error('Unexpected network request');};
  try{
    assert.deepEqual(await catalog.set('gym1',signal),gymHeroesSet);
    assert.ok(packAvailability('gym1').ready);
    assert.deepEqual(gymHeroesSet.boosters.map(b=>b.id),['brock','misty','erika','lt-surge']);
    for(const b of gymHeroesSet.boosters){
      assert.equal(b.edition,'first-edition');
      assert.ok(existsSync(`public${b.front}`)&&existsSync(`public${b.back}`));
    }
    for(const c of gymHeroesCards)assert.deepEqual(await catalog.card(c.id,gymHeroesSet,signal),c);
    await assert.rejects(catalog.card('base5-1',gymHeroesSet,signal),/Unknown/);
    await assert.rejects(catalog.card('gym1-1',{...gymHeroesSet,id:'gym2'},signal),/does not belong/);
  }finally{globalThis.fetch=old;}
});

test('Gym Heroes packs use 6 commons, 1 Energy, 3 uncommons, 1 rare with deterministic complete coverage',()=>{
  const seen=new Set<string>();let holos=0;
  for(let seed=0;seed<3000;seed++){
    const pack=collatePokemon('gym1','brock',seed,gymHeroesCards);
    assert.equal(pack.pulls.length,11);
    assert.ok(pack.pulls.slice(0,6).every(p=>p.card.rarity==='Common'&&p.card.category!=='Energy'&&p.variant==='normal'));
    assert.equal(new Set(pack.pulls.slice(0,6).map(p=>p.card.id)).size,6);
    assert.equal(pack.pulls[6].card.category,'Energy');assert.equal(pack.pulls[6].card.energyType,'Normal');
    assert.ok(pack.pulls.slice(7,10).every(p=>p.card.rarity==='Uncommon'&&p.variant==='normal'));
    assert.equal(new Set(pack.pulls.slice(7,10).map(p=>p.card.id)).size,3);
    const rare=pack.pulls[10];assert.equal(rare.slot,'rare:1');
    assert.equal(rare.card.rarity,rare.variant==='holo'?'Holo Rare':'Rare');
    if(rare.variant==='holo')holos++;
    pack.pulls.forEach(p=>{seen.add(p.card.id);assert.equal(p.card.edition,'first-edition');});
    if(seed<30)for(const art of ['misty','erika','lt-surge'])assert.deepEqual(pack.pulls,collatePokemon('gym1',art,seed,[...gymHeroesCards].reverse()).pulls);
  }
  assert.equal(seen.size,132);assert.ok(holos>900&&holos<1100,`${holos} holos / 3000`);
  for(const n of [1,6,8,19,20,127,132])assert.throws(()=>collatePokemon('gym1','brock',1,gymHeroesCards.filter(c=>c.localId!==String(n))),/Incomplete/);
  assert.throws(()=>collatePokemon('gym1','invalid',1,gymHeroesCards),/booster/);
  assert.throws(()=>collatePokemon('gym1','brock',1,gymHeroesCards.map(c=>({...c,editionFronts:{unlimited:c.front}}))),/fronts/);
});
