import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { neoRevelationCards, neoRevelationSet } from '../src/pokemon/NeoRevelationCatalog.ts';
import { neoRevelationDefinitions } from '../src/card/NeoRevelationCards.ts';
import { cards } from '../src/card/CardDefinition.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { packAvailability } from '../src/pokemon/availability.ts';

test('Neo Revelation preserves 66 TCGdex fronts and supplies 16 PNG holo treatments',()=>{
  assert.equal(neoRevelationCards.length,66);
  assert.equal(neoRevelationCards.filter(c=>c.variants.includes('holo')).length,16);
  assert.equal(neoRevelationDefinitions.length,66);
  const sources=JSON.parse(readFileSync('public/cards/pokemon/neo-revelation/sources.json','utf8'));
  for(const s of sources)assert.equal(createHash('sha256').update(readFileSync(`public/cards/pokemon/neo-revelation/${s.file}`)).digest('hex'),s.sha256);
  for(const c of neoRevelationCards){
    const d=pokemonDefinition(c,c.variants[0],cards);
    assert.equal(d.proceduralFoil,undefined);
    assert.ok(existsSync(`public${d.front}`));
    if(c.variants[0]==='holo'){
      assert.equal(d.profile,'pokemon-base-set-2-cosmos');
      for(const path of Object.values(d.maps!)){
        assert.ok(path.endsWith('.png'));const bytes=readFileSync(`public${path}`);
        assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),1650);
      }
    }else assert.equal(d.profile,'print-only');
  }
});
test('Neo Revelation packs reach all cards including distinct non-holo counterparts and use 7/3/1 slots',()=>{
  const seen=new Set<string>();let holos=0,shinings=0;
  for(let seed=0;seed<3000;seed++){
    const p=collatePokemon('neo3','entei',seed,neoRevelationCards);
    assert.equal(p.pulls.length,11);
    assert.deepEqual(p.pulls.map(p=>p.slot.split(':')[0]),[...Array(7).fill('common'),...Array(3).fill('uncommon'),'rare']);
    assert.equal(new Set(p.pulls.slice(0,7).map(p=>p.card.id)).size,7);
    if(p.pulls[10].card.rarity==='Holo Rare')holos++;
    if(p.pulls[10].card.rarity==='Shining Rare')shinings++;
    p.pulls.forEach(p=>seen.add(p.card.id));
    if(seed<10)assert.deepEqual(p.pulls,collatePokemon('neo3','suicune',seed,[...neoRevelationCards].reverse()).pulls);
  }
  assert.equal(seen.size,66);assert.ok(seen.has('neo3-9'));assert.ok(holos>900&&holos<1100);assert.ok(shinings>190&&shinings<310);assert.ok(seen.has('neo3-65')&&seen.has('neo3-66'));
  assert.throws(()=>collatePokemon('neo3','suicune',1,neoRevelationCards.filter(c=>c.localId!=='9')),/Incomplete/);
});
test('Neo Revelation serves the local catalog and all four historical wrappers',async()=>{
  const adapter=new TcgdexAdapter(),signal=new AbortController().signal;
  assert.deepEqual(await adapter.set('neo3',signal),neoRevelationSet);
  assert.ok(packAvailability('neo3').ready);
  assert.equal(neoRevelationSet.boosters.length,4);
  for(const b of neoRevelationSet.boosters)assert.ok(existsSync(`public${b.front}`)&&existsSync(`public${b.back}`));
  for(const c of neoRevelationCards)assert.deepEqual(await adapter.card(c.id,neoRevelationSet,signal),c);
  await assert.rejects(adapter.card('gym2-1',neoRevelationSet,signal),/does not belong/);
});

test('Neo Revelation counterparts stay print-only and renaming cannot change treatment',()=>{
  for(const card of neoRevelationCards){
    const d=pokemonDefinition({...card,name:'Same name'},card.variants[0],cards);
    assert.equal(d.pokemon!.id,card.id);
    if(card.variants[0]==='normal'){assert.equal(d.profile,'print-only');assert.equal(d.maps,undefined);}
  }
  const masks=JSON.parse(readFileSync('scripts/neo-revelation/mask-sources.json','utf8'));
  assert.equal(masks.length,16);
  for(const m of masks)assert.equal(createHash('sha256').update(readFileSync(`scripts/neo-revelation/masks/${m.cardId.split('-')[1]}.png`)).digest('hex'),m.sha256);
});
