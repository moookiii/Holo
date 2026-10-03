import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { neoGenesisCards, neoGenesisSet } from '../src/pokemon/NeoGenesisCatalog.ts';
import { neoGenesisDefinitions } from '../src/card/NeoGenesisCards.ts';
import { cards } from '../src/card/CardDefinition.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { packAvailability } from '../src/pokemon/availability.ts';

test('Neo Genesis preserves 111 TCGdex fronts and supplies 18 new PNG holo treatments',()=>{
  assert.equal(neoGenesisCards.length,111);
  assert.equal(neoGenesisCards.filter(c=>c.variants.includes('holo')).length,19);
  assert.equal(neoGenesisDefinitions.length,110);
  const sources=JSON.parse(readFileSync('public/cards/pokemon/neo-genesis/sources.json','utf8'));
  for(const s of sources)assert.equal(createHash('sha256').update(readFileSync(`public/cards/pokemon/neo-genesis/${s.file}`)).digest('hex'),s.sha256);
  for(const c of neoGenesisCards){
    const d=pokemonDefinition(c,c.variants[0],cards);
    assert.equal(d.proceduralFoil,undefined);
    assert.ok(existsSync(`public${d.front}`));
    if(c.localId==='9'){
      const original=cards.find(d=>d.id==='lugia-neo-genesis')!;
      assert.equal(d.front,original.front);assert.deepEqual(d.maps,original.maps);assert.equal(d.profile,original.profile);
    }else if(c.variants[0]==='holo'){
      assert.equal(d.profile,'pokemon-base-set-2-cosmos');
      for(const path of Object.values(d.maps!)){
        assert.ok(path.endsWith('.png'));const bytes=readFileSync(`public${path}`);
        assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),1650);
      }
    }else assert.equal(d.profile,'print-only');
  }
});
test('Neo Genesis packs reach all cards including existing Lugia and use 7/3/1 slots',()=>{
  const seen=new Set<string>();let holos=0;
  for(let seed=0;seed<3000;seed++){
    const p=collatePokemon('neo1','typhlosion',seed,neoGenesisCards);
    assert.equal(p.pulls.length,11);
    assert.deepEqual(p.pulls.map(p=>p.slot.split(':')[0]),[...Array(7).fill('common'),...Array(3).fill('uncommon'),'rare']);
    assert.equal(new Set(p.pulls.slice(0,7).map(p=>p.card.id)).size,7);
    if(p.pulls[10].variant==='holo')holos++;
    p.pulls.forEach(p=>seen.add(p.card.id));
    if(seed<10)assert.deepEqual(p.pulls,collatePokemon('neo1','lugia',seed,[...neoGenesisCards].reverse()).pulls);
  }
  assert.equal(seen.size,111);assert.ok(seen.has('neo1-9'));assert.ok(holos>900&&holos<1100);
  assert.throws(()=>collatePokemon('neo1','lugia',1,neoGenesisCards.filter(c=>c.localId!=='9')),/Incomplete/);
});
test('Neo Genesis serves the local catalog and all four supplied wrappers',async()=>{
  const adapter=new TcgdexAdapter(),signal=new AbortController().signal;
  assert.deepEqual(await adapter.set('neo1',signal),neoGenesisSet);
  assert.ok(packAvailability('neo1').ready);
  assert.equal(neoGenesisSet.boosters.length,4);
  for(const b of neoGenesisSet.boosters)assert.ok(existsSync(`public${b.front}`)&&existsSync(`public${b.back}`));
  for(const c of neoGenesisCards)assert.deepEqual(await adapter.card(c.id,neoGenesisSet,signal),c);
  await assert.rejects(adapter.card('gym2-1',neoGenesisSet,signal),/does not belong/);
});
