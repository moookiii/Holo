import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { neoDestinyCards, neoDestinySet } from '../src/pokemon/NeoDestinyCatalog.ts';
import { neoDestinyDefinitions } from '../src/card/NeoDestinyCards.ts';
const cards = neoDestinyDefinitions;
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { packAvailability } from '../src/pokemon/availability.ts';

test('Neo Destiny preserves 113 TCGdex fronts and supplies 24 PNG holo treatments',()=>{
  assert.equal(neoDestinyCards.length,113);
  assert.equal(neoDestinyCards.filter(c=>c.variants.includes('holo')).length,24);
  assert.equal(neoDestinyDefinitions.length,113);
  const sources=JSON.parse(readFileSync('public/cards/pokemon/neo-destiny/sources.json','utf8'));
  for(const s of sources)assert.equal(createHash('sha256').update(readFileSync(`public/cards/pokemon/neo-destiny/${s.file}`)).digest('hex'),s.sha256);
  for(const c of neoDestinyCards){
    const d=pokemonDefinition(c,c.variants[0],cards);
    assert.equal(d.proceduralFoil,undefined);
    assert.ok(existsSync(`public${d.front}`));
    if(c.variants[0]==='holo'){
      assert.equal(d.profile,Number(c.localId)>=106?'pokemon-team-rocket-trainer':'pokemon-base-set-2-cosmos');
      assert.equal(d.maps!.normal,undefined);assert.equal(d.maps!.height,undefined);
      if(Number(c.localId)>=106)assert.equal(d.maps!.motif,undefined);
      for(const path of Object.values(d.maps!)){
        assert.ok(path.endsWith('.png'));const bytes=readFileSync(`public${path}`);
        assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),1650);
      }
    }else assert.equal(d.profile,'print-only');
  }
});
test('Neo Destiny packs reach all cards including distinct non-holo counterparts and use 7/3/1 slots',()=>{
  const seen=new Set<string>();let holos=0,shinings=0;
  for(let seed=0;seed<3000;seed++){
    const p=collatePokemon('neo4','noctowl',seed,neoDestinyCards);
    assert.equal(p.pulls.length,11);
    assert.deepEqual(p.pulls.map(p=>p.slot.split(':')[0]),[...Array(7).fill('common'),...Array(3).fill('uncommon'),'rare']);
    assert.equal(new Set(p.pulls.slice(0,7).map(p=>p.card.id)).size,7);
    if(p.pulls[10].card.rarity==='Holo Rare')holos++;
    if(p.pulls[10].card.rarity==='Shining Rare')shinings++;
    p.pulls.forEach(p=>seen.add(p.card.id));
    if(seed<10)assert.deepEqual(p.pulls,collatePokemon('neo4','togetic',seed,[...neoDestinyCards].reverse()).pulls);
  }
  assert.equal(seen.size,113);assert.ok(seen.has('neo4-9'));assert.ok(holos>900&&holos<1100);assert.ok(shinings>120&&shinings<220);assert.ok(seen.has('neo4-106')&&seen.has('neo4-113'));
  assert.throws(()=>collatePokemon('neo4','togetic',1,neoDestinyCards.filter(c=>c.localId!=='9')),/Incomplete/);
});
test('Neo Destiny serves the local catalog and all four historical wrappers',async()=>{
  const adapter=new TcgdexAdapter(),signal=new AbortController().signal;
  assert.deepEqual(await adapter.set('neo4',signal),neoDestinySet);
  assert.ok(packAvailability('neo4').ready);
  assert.equal(neoDestinySet.boosters.length,4);
  for(const b of neoDestinySet.boosters)assert.ok(existsSync(`public${b.front}`)&&existsSync(`public${b.back}`));
  for(const c of neoDestinyCards)assert.deepEqual(await adapter.card(c.id,neoDestinySet,signal),c);
  await assert.rejects(adapter.card('gym2-1',neoDestinySet,signal),/does not belong/);
});

test('Neo Destiny counterparts stay print-only and renaming cannot change treatment',()=>{
  for(const card of neoDestinyCards){
    const d=pokemonDefinition({...card,name:'Same name'},card.variants[0],cards);
    assert.equal(d.pokemon!.id,card.id);
    if(card.variants[0]==='normal'){assert.equal(d.profile,'print-only');assert.equal(d.maps,undefined);}
  }
  const masks=JSON.parse(readFileSync('scripts/neo-destiny/mask-sources.json','utf8'));
  assert.equal(masks.length,24);
  for(const m of masks)assert.equal(createHash('sha256').update(readFileSync(`scripts/neo-destiny/masks/${m.cardId.split('-')[1]}.png`)).digest('hex'),m.sha256);
});


test('Neo Destiny keeps gallery release order, exact numbering, and separate Shining coverage', async()=>{
  const { compareGallerySetNames } = await import('../src/gallery/GalleryQuery.ts');
  assert.ok(compareGallerySetNames('Neo Revelation','Neo Destiny')<0);
  assert.ok(compareGallerySetNames('Neo Destiny','Legendary Collection')<0);
  assert.equal(neoDestinySet.releaseDate,'2002-02-28');
  assert.deepEqual(neoDestinyCards.map(c=>Number(c.localId)),Array.from({length:113},(_,i)=>i+1));
  assert.equal(neoDestinyCards.filter(c=>c.rarity==='Holo Rare').length,16);
  assert.equal(neoDestinyCards.filter(c=>c.rarity==='Shining Rare').length,8);
  assert.equal(neoDestinyCards.filter(c=>c.variants[0]==='normal').length,89);
  for(const c of neoDestinyDefinitions.filter(c=>Number(c.pokemon!.localId)>=106)) {
    assert.ok(c.maps!.foil!.endsWith(`${c.pokemon!.localId}-foil.png`));
    assert.equal(c.maps!.motif,undefined);
    assert.equal(c.mapSettings!.embossStrength,0);
  }
  const outputs=JSON.parse(readFileSync('scripts/neo-destiny/map-evidence.json','utf8')).outputs;
  for(const m of outputs)assert.equal(createHash('sha256').update(readFileSync(`public/cards/pokemon/neo-destiny/maps/${m.file}`)).digest('hex'),m.sha256);
});
