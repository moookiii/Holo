import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { neoDiscoveryCards, neoDiscoverySet } from '../src/pokemon/NeoDiscoveryCatalog.ts';
import { neoDiscoveryDefinitions } from '../src/card/NeoDiscoveryCards.ts';
import { cards } from '../src/card/CardDefinition.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { packAvailability } from '../src/pokemon/availability.ts';

test('Neo Discovery preserves 75 TCGdex fronts and supplies 17 PNG holo treatments',()=>{
  assert.equal(neoDiscoveryCards.length,75);
  assert.equal(neoDiscoveryCards.filter(c=>c.variants.includes('holo')).length,17);
  assert.equal(neoDiscoveryDefinitions.length,75);
  const sources=JSON.parse(readFileSync('public/cards/pokemon/neo-discovery/sources.json','utf8'));
  for(const s of sources)assert.equal(createHash('sha256').update(readFileSync(`public/cards/pokemon/neo-discovery/${s.file}`)).digest('hex'),s.sha256);
  for(const c of neoDiscoveryCards){
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
test('Neo Discovery packs reach all cards including distinct non-holo counterparts and use 7/3/1 slots',()=>{
  const seen=new Set<string>();let holos=0;
  for(let seed=0;seed<3000;seed++){
    const p=collatePokemon('neo2','scizor',seed,neoDiscoveryCards);
    assert.equal(p.pulls.length,11);
    assert.deepEqual(p.pulls.map(p=>p.slot.split(':')[0]),[...Array(7).fill('common'),...Array(3).fill('uncommon'),'rare']);
    assert.equal(new Set(p.pulls.slice(0,7).map(p=>p.card.id)).size,7);
    if(p.pulls[10].variant==='holo')holos++;
    p.pulls.forEach(p=>seen.add(p.card.id));
    if(seed<10)assert.deepEqual(p.pulls,collatePokemon('neo2','umbreon',seed,[...neoDiscoveryCards].reverse()).pulls);
  }
  assert.equal(seen.size,75);assert.ok(seen.has('neo2-9'));assert.ok(holos>900&&holos<1100);
  assert.throws(()=>collatePokemon('neo2','umbreon',1,neoDiscoveryCards.filter(c=>c.localId!=='9')),/Incomplete/);
});
test('Neo Discovery serves the local catalog and all four historical wrappers',async()=>{
  const adapter=new TcgdexAdapter(),signal=new AbortController().signal;
  assert.deepEqual(await adapter.set('neo2',signal),neoDiscoverySet);
  assert.ok(packAvailability('neo2').ready);
  assert.equal(neoDiscoverySet.boosters.length,4);
  for(const b of neoDiscoverySet.boosters)assert.ok(existsSync(`public${b.front}`)&&existsSync(`public${b.back}`));
  for(const c of neoDiscoveryCards)assert.deepEqual(await adapter.card(c.id,neoDiscoverySet,signal),c);
  await assert.rejects(adapter.card('gym2-1',neoDiscoverySet,signal),/does not belong/);
});

test('Neo Discovery counterparts stay print-only and renaming cannot change treatment',()=>{
  for(const card of neoDiscoveryCards){
    const d=pokemonDefinition({...card,name:'Same name'},card.variants[0],cards);
    assert.equal(d.pokemon!.id,card.id);
    if(Number(card.localId)>17){assert.equal(d.profile,'print-only');assert.equal(d.maps,undefined);}
  }
  const masks=JSON.parse(readFileSync('scripts/neo-discovery/mask-sources.json','utf8'));
  assert.equal(masks.length,17);
  for(const m of masks)assert.equal(createHash('sha256').update(readFileSync(`scripts/neo-discovery/masks/${m.cardId.split('-')[1]}.png`)).digest('hex'),m.sha256);
});
