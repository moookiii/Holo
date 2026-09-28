import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { baseSet2Cards, baseSet2Set } from '../src/pokemon/BaseSet2Catalog.ts';
import { baseSet2Definitions } from '../src/card/BaseSet2Cards.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonDefinition, pokemonProfile } from '../src/pokemon/materials.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { pokemonProfiles } from '../src/materials/profiles/pokemon.ts';
import { generateBaseSet2Cosmos } from '../src/materials/patterns/BaseSet2Cosmos.ts';

test('Base Set 2 has the exact 130 English retail prints, including its own Trainer rarity pools', () => {
  assert.deepEqual(baseSet2Cards.map(c=>c.id),Array.from({length:130},(_,i)=>`base4-${i+1}`));
  assert.deepEqual(['Holo Rare','Rare','Uncommon','Common'].map(r=>baseSet2Cards.filter(c=>c.rarity===r).length),[20,20,42,48]);
  const sources=JSON.parse(readFileSync('public/cards/pokemon/base-set-2/sources.json','utf8'));
  for(const [i,c] of baseSet2Cards.entries()) {
    assert.deepEqual(c.variants,[i<20?'holo':'normal']);
    assert.equal(createHash('sha256').update(readFileSync(`public${c.front}`)).digest('hex'),sources[i].sha256);
  }
  assert.equal(baseSet2Cards[24].name,'Electrode'); assert.equal(baseSet2Cards[24].rarity,'Rare');
  assert.equal(baseSet2Cards[100].name,'Computer Search'); assert.equal(baseSet2Cards[100].rarity,'Rare');
  assert.equal(baseSet2Cards[123].energyType,'Special');
  assert.ok(baseSet2Cards.slice(124).every(c=>c.energyType==='Normal'));
  for(const name of ['Machamp','Porygon','Koffing','Ponyta','Clefairy Doll','Devolution Spray','Revive']) assert.ok(!baseSet2Cards.some(c=>c.name===name));
});

test('all twenty reprint holos resolve to registered PNG masks and the exclusive Cosmos profile', () => {
  assert.equal(baseSet2Definitions.length,130);
  const p=pokemonProfiles.find(p=>p.id==='pokemon-base-set-2-cosmos')!;
  assert.equal(p.structure.field,'base-set-2-cosmos');
  assert.equal(p.structure.relief,0); assert.equal(p.structure.engraving,0); assert.equal(p.glints.strength,0);
  for(const c of baseSet2Cards) {
    const variant=c.variants[0],d=pokemonDefinition(c,variant,[]);
    assert.equal(d.profile,variant==='holo'?p.id:'print-only');
    assert.equal(pokemonProfile(c,variant),d.profile);
    assert.equal(d.front,c.front); assert.equal(d.pokemon?.treatmentStatus,undefined);
    assert.equal(d.maps?.normal,undefined);
    assert.equal(d.proceduralFoil,undefined);
    if(variant==='holo') for(const file of [d.maps!.foil!,d.maps!.protection!,d.maps!.motif!]) {
      const b=readFileSync(`public${file}`); assert.equal(b.readUInt32BE(16),1200); assert.equal(b.readUInt32BE(20),1650);
    }
    else assert.equal(d.maps,undefined);
    assert.throws(()=>pokemonDefinition(c,'reverse',[]),/Invalid/);
  }
});

test('local Base Set 2 catalog needs no metadata network requests and provides four wrappers', async () => {
  const catalog=new TcgdexAdapter(),signal=new AbortController().signal,original=globalThis.fetch;
  globalThis.fetch=async()=>{throw new Error('Unexpected network request');};
  try {
    const set=await catalog.set('base4',signal);assert.deepEqual(set,baseSet2Set);
    assert.equal(set.boosters.length,4);
    for(const b of set.boosters) assert.ok(readFileSync(`public${b.front}`).length>1000);
    for(const c of baseSet2Cards) assert.deepEqual(await catalog.card(c.id,set,signal),c);
    await assert.rejects(catalog.card('base1-4',set,signal),/Unknown Base Set 2/);
  } finally {globalThis.fetch=original;}
});

test('Base Set 2 packs remain deterministic across wrappers, with 5 commons, 2 Energy, 3 uncommons and 1 rare', () => {
  const seen=new Set<string>();let holos=0;
  for(let seed=0;seed<3000;seed++) {
    const pack=collatePokemon('base4','mewtwo',seed,baseSet2Cards);
    assert.equal(pack.pulls.length,11);
    assert.ok(pack.pulls.slice(0,5).every(p=>p.card.rarity==='Common'&&p.card.category!=='Energy'));
    assert.equal(new Set(pack.pulls.slice(0,5).map(p=>p.card.id)).size,5);
    assert.ok(pack.pulls.slice(5,7).every(p=>p.card.energyType==='Normal'&&p.variant==='normal'));
    assert.ok(pack.pulls.slice(7,10).every(p=>p.card.rarity==='Uncommon'));
    assert.equal(new Set(pack.pulls.slice(7,10).map(p=>p.card.id)).size,3);
    const rare=pack.pulls[10];assert.equal(rare.variant,Number(rare.card.localId)<=20?'holo':'normal');
    assert.ok(['Holo Rare','Rare'].includes(rare.card.rarity));if(rare.variant==='holo')holos++;
    assert.ok(pack.pulls.every(p=>p.card.setId==='base4'&&p.variant!=='reverse'));
    pack.pulls.forEach(p=>seen.add(p.card.id));
    assert.deepEqual(pack.pulls,collatePokemon('base4','raichu',seed,[...baseSet2Cards].reverse()).pulls);
    assert.equal(pack.identity,collatePokemon('base4','mewtwo',seed,baseSet2Cards).identity);
  }
  assert.equal(seen.size,130);assert.ok(holos>900&&holos<1100);
  assert.throws(()=>collatePokemon('base4','unknown',1,baseSet2Cards),/booster/);
  for(const number of [1,21,33,65,101,124,125]) assert.throws(()=>collatePokemon('base4','mewtwo',1,baseSet2Cards.filter(c=>c.localId!==String(number))),/Incomplete/);
});

test('registered Cosmos preserves exact dot support and top-down registration across seed and scale changes', () => {
  const spec={kind:'base-set-2-cosmos' as const,seed:200004,aspect:1,scale:29};
  const image={width:8,height:8,data:new Uint8Array(64)};
  image.data[1*8+2]=255;image.data[1*8+3]=255;image.data[2*8+2]=255;image.data[2*8+3]=255;
  image.data[5*8+6]=255;
  const a=generateBaseSet2Cosmos(spec,64,image),b=generateBaseSet2Cosmos(spec,64,image),c=generateBaseSet2Cosmos({...spec,seed:200005,scale:90},64,image);
  assert.deepEqual(a.direction,b.direction);assert.notDeepEqual(a.direction,c.direction);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++) {
    const i=(y*64+x)*4,expected=image.data[Math.floor((63-y)/8)*8+Math.floor(x/8)]>0;
    assert.equal(a.direction[i+3]>40,expected);assert.equal(c.direction[i+3]>40,expected);
    assert.equal(a.relief[i+2],128);
  }
  const missing=generateBaseSet2Cosmos(spec,64);
  for(let i=3;i<missing.direction.length;i+=4)assert.equal(missing.direction[i],5,'No invented dots without a registered image');
});
