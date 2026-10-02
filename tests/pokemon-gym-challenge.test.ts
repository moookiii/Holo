import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gymChallengeCards, gymChallengeSet } from '../src/pokemon/GymChallengeCatalog.ts';
import { gymChallengeRecipe } from '../src/pokemon/GymChallengeProduct.ts';
import { gymChallengeDefinitions } from '../src/card/GymChallengeCards.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonDefinition, pokemonProfile } from '../src/pokemon/materials.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { packAvailability } from '../src/pokemon/availability.ts';

test('Gym Challenge preserves all 132 numbered TCGdex fronts and the six Basic Energies', () => {
  assert.deepEqual(gymChallengeCards.map(c=>Number(c.localId)),Array.from({length:132},(_,i)=>i+1));
  const counts: Record<string,number>={};
  for(const c of gymChallengeCards)counts[c.rarity]=(counts[c.rarity]??0)+1;
  assert.deepEqual(counts,{'Holo Rare':20,Rare:21,Uncommon:42,Common:49});
  assert.deepEqual(gymChallengeCards.filter(c=>c.category==='Energy').map(c=>c.localId),['127','128','129','130','131','132']);
  assert.ok(gymChallengeCards.filter(c=>c.category==='Energy').every(c=>c.energyType==='Normal'));
  const sources=JSON.parse(readFileSync('public/cards/pokemon/gym-challenge/sources.json','utf8'));
  assert.equal(sources.length,132);
  for(const s of sources)assert.equal(createHash('sha256').update(readFileSync(`public/cards/pokemon/gym-challenge/${s.file}`)).digest('hex'),s.sha256);
});

test('all 20 Gym Challenge holos resolve PNG masks and registered Cosmos with no procedural fallback',()=>{
  assert.equal(gymChallengeDefinitions.length,132);
  assert.equal(new Set(gymChallengeDefinitions.map(d=>d.id)).size,132);
  for(const d of gymChallengeDefinitions){
    const card=d.pokemon!,resolved=pokemonDefinition(card,card.variant,[]);
    assert.equal(resolved.id,d.id);assert.equal(resolved.front,d.front);
    assert.equal(resolved.number,d.number);assert.match(d.number,/\/132 \u00b7 1st Edition/);
    assert.equal(card.edition,'first-edition');
    assert.deepEqual(Object.keys(card.editionFronts!),['first-edition']);
    const holo=Number(card.localId)<=20,profile=holo?'pokemon-base-set-2-cosmos':'print-only';
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

test('Gym Challenge catalog serves all cards and four first edition wrappers locally',async()=>{
  const catalog=new TcgdexAdapter(),signal=new AbortController().signal,old=globalThis.fetch;
  globalThis.fetch=async()=>{throw Error('Unexpected network request');};
  try{
    assert.deepEqual(await catalog.set('gym2',signal),gymChallengeSet);
    assert.ok(packAvailability('gym2').ready);
    assert.deepEqual(gymChallengeSet.boosters.map(b=>b.id),['blaine','giovanni','koga','sabrina']);
    for(const b of gymChallengeSet.boosters){
      assert.equal(b.edition,'first-edition');
      assert.ok(existsSync(`public${b.front}`)&&existsSync(`public${b.back}`));
    }
    for(const c of gymChallengeCards)assert.deepEqual(await catalog.card(c.id,gymChallengeSet,signal),c);
    await assert.rejects(catalog.card('base5-1',gymChallengeSet,signal),/does not belong/);
    await assert.rejects(catalog.card('gym2-1',{...gymChallengeSet,id:'gym1'},signal),/does not belong/);
  }finally{globalThis.fetch=old;}
});

test('Gym Challenge packs use 6 commons, 1 rare, 3 uncommons, 1 Energy with deterministic complete coverage',()=>{
  const seen=new Set<string>();let holos=0;
  for(let seed=0;seed<3000;seed++){
    const pack=collatePokemon('gym2','blaine',seed,gymChallengeCards);
    assert.equal(pack.pulls.length,11);
    assert.deepEqual(pack.pulls.map(p=>p.slot.split(':')[0]),[...Array(6).fill('common'),'rare',...Array(3).fill('uncommon'),'energy']);
    assert.ok(pack.pulls.slice(0,6).every(p=>p.card.rarity==='Common'&&p.card.category!=='Energy'&&p.variant==='normal'));
    assert.equal(new Set(pack.pulls.slice(0,6).map(p=>p.card.id)).size,6);
    assert.equal(pack.pulls[10].card.category,'Energy');assert.equal(pack.pulls[10].card.energyType,'Normal');
    assert.ok(pack.pulls.slice(7,10).every(p=>p.card.rarity==='Uncommon'&&p.variant==='normal'));
    assert.equal(new Set(pack.pulls.slice(7,10).map(p=>p.card.id)).size,3);
    const rare=pack.pulls[6];assert.equal(rare.slot,'rare:1');
    assert.equal(rare.card.rarity,rare.variant==='holo'?'Holo Rare':'Rare');
    if(rare.variant==='holo')holos++;
    pack.pulls.forEach(p=>{seen.add(p.card.id);assert.equal(p.card.edition,'first-edition');});
    if(seed<30)for(const art of ['giovanni','koga','sabrina'])assert.deepEqual(pack.pulls,collatePokemon('gym2',art,seed,[...gymChallengeCards].reverse()).pulls);
  }
  assert.equal(seen.size,132);assert.ok(holos>900&&holos<1100,`${holos} holos / 3000`);
  for(const n of [1,6,8,19,20,127,132])assert.throws(()=>collatePokemon('gym2','blaine',1,gymChallengeCards.filter(c=>c.localId!==String(n))),/Incomplete/);
  assert.throws(()=>collatePokemon('gym2','invalid',1,gymChallengeCards),/booster/);
  assert.throws(()=>collatePokemon('gym2','blaine',1,gymChallengeCards.map(c=>({...c,editionFronts:{unlimited:c.front}}))),/fronts/);
});


test('Gym Challenge probability model exposes the correct pools and preserves the supplied pack back',()=>{
  const rare=gymChallengeRecipe.slots.find(s=>s.id==='rare')!;
  assert.deepEqual(rare.outcomes.map(o=>[o.rarities[0],o.weight]),[['Rare',2/3],['Holo Rare',1/3]]);
  const counts=(rarity:string)=>gymChallengeCards.filter(c=>c.rarity===rarity).length;
  assert.equal(counts('Holo Rare'),20);assert.equal(counts('Rare'),21);
  assert.equal((1/3)/counts('Holo Rare'),1/60);
  assert.equal((2/3)/counts('Rare'),2/63);
  assert.equal(gymChallengeCards.filter(c=>c.rarity==='Common'&&c.category!=='Energy').length,43);
  const back=JSON.parse(readFileSync('scripts/gym-challenge/back-source.json','utf8'));
  assert.equal(createHash('sha256').update(readFileSync('public/packs/pokemon/gym2-back.png')).digest('hex'),back.sha256);
  assert.ok(gymChallengeSet.boosters.every(b=>b.back==='/packs/pokemon/gym2-back.png'));
});


test('card 107 uses the supplied first edition front without altering TCGdex metadata',()=>{
  const c=gymChallengeCards.find(c=>c.localId==='107')!;
  assert.equal(c.name,"Lt. Surge's Secret Plan");
  assert.equal(c.front,'/cards/pokemon/gym-challenge/107-first-edition.png');
  const source=JSON.parse(readFileSync('scripts/gym-challenge/first-edition-override.json','utf8'));
  assert.equal(createHash('sha256').update(readFileSync(`public${c.front}`)).digest('hex'),source.sha256);
  assert.equal(c.rarity,'Rare');assert.equal(c.edition,'first-edition');
});
