import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {aquapolisCards,aquapolisSet} from '../src/pokemon/AquapolisCatalog.ts';
import {aquapolisDefinitions} from '../src/card/AquapolisCards.ts';
import {aquapolisRecipe} from '../src/pokemon/AquapolisProduct.ts';
import {cards} from '../src/card/CardDefinition.ts';
import {pokemonDefinition} from '../src/pokemon/materials.ts';
import {pokemonCatalog} from '../src/pokemon/TcgdexAdapter.ts';
import {collatePokemon} from '../src/pokemon/collator.ts';
import {filterCards,compareGallerySetNames} from '../src/gallery/GalleryQuery.ts';

test('Aquapolis checklist retains a/b pairs, separate H cards and holo-only Crystals',async()=>{
 assert.equal(aquapolisCards.length,186);
 assert.equal(aquapolisDefinitions.length,337);
 assert.equal(new Set(aquapolisCards.map(c=>c.id)).size,186);
 assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);
 const sources=JSON.parse(readFileSync('public/cards/pokemon/aquapolis/sources.json','utf8'));
 const catalog=JSON.parse(readFileSync('public/cards/pokemon/aquapolis/catalog.json','utf8'));
 assert.equal(catalog.printedTotal,147);
 for(const card of aquapolisCards){
  const h=card.localId.startsWith('H'),secret=Number(card.localId)>147;
  assert.deepEqual(card.variants,h||secret?['holo']:['normal','reverse'],card.id);
  assert.equal(card.rarity,h?'Holo Rare':secret?'Secret Rare':card.rarity);
  const bytes=readFileSync(`public${card.front}`),source=sources.find((s:{cardId:string})=>s.cardId===card.id);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
  assert.ok(existsSync(`public${card.thumbnail}`));
  for(const variant of card.variants){
   const def=pokemonDefinition(card,variant,cards);
   assert.equal(def.id,`pokemon:${card.id}:${variant}`);
   assert.equal(def.profile,variant==='reverse'?'pokemon-e-reader':'print-only');
   assert.equal(def.proceduralFoil,undefined);
   assert.equal(def.maps?.normal,undefined);assert.equal(def.maps?.height,undefined);
   for(const path of Object.values(def.maps??{}))assert.ok(existsSync(`public${path}`),path);
  }
 }
 for(const n of [50,74,95,103])for(const letter of ['a','b'])assert.ok(aquapolisCards.some(c=>c.localId===`${n}${letter}`));
 for(let n=1;n<=32;n++)assert.ok(aquapolisCards.some(c=>c.localId===`H${n}`));
 const signal=new AbortController().signal;
 assert.deepEqual(await pokemonCatalog.set('ecard2',signal),aquapolisSet);
 assert.equal((await pokemonCatalog.cards(aquapolisSet,signal)).length,186);
 assert.equal(filterCards(cards,{search:'',set:'Aquapolis'}).length,337);
 for(const [finish,count] of [['normal',151],['reverse',151],['regular-holo',35]] as const)
  assert.equal(filterCards(cards,{search:'',set:'Aquapolis',finish}).length,count);
 assert.ok(compareGallerySetNames('Expedition Base Set','Aquapolis')<0);
 assert.ok(compareGallerySetNames('Aquapolis','EX Ruby & Sapphire')<0);
});

test('Nine-card Aquapolis packs keep the rare and reverse; H cards replace a common',()=>{
 assert.equal(aquapolisRecipe.slots.reduce((n,s)=>n+s.count,0),9);
 let holos=0;const reverses=new Set<string>();const energies=new Set<string>();
 for(let seed=0;seed<3000;seed++){
  const pack=collatePokemon('ecard2','arcanine',seed,aquapolisCards);
  assert.equal(pack.pulls.length,9);
  assert.equal(pack.pulls.filter(p=>p.slot.startsWith('rare:')&&p.card.rarity==='Rare'&&p.variant==='normal').length,1);
  assert.equal(pack.pulls.filter(p=>p.slot.startsWith('uncommon:')&&p.variant==='normal').length,2);
  const holo=pack.pulls.filter(p=>p.variant==='holo');holos+=holo.length;
  assert.equal(pack.pulls.filter(p=>p.variant==='normal'&&p.card.rarity==='Common').length,holo.length?4:5);
  assert.ok(holo.every(p=>p.card.localId.startsWith('H')));
  const reverse=pack.pulls.filter(p=>p.variant==='reverse');assert.equal(reverse.length,1);reverses.add(reverse[0].card.id);
  assert.ok(!pack.pulls.some(p=>p.card.rarity==='Secret Rare'||p.card.setId==='sve'));
  pack.pulls.filter(p=>p.card.category==='Energy').forEach(p=>energies.add(p.card.id));
 }
 assert.ok(holos>900&&holos<1100,`${holos}/3000`);assert.equal(reverses.size,151);assert.equal(energies.size,6);
 for(const booster of aquapolisSet.boosters){
  assert.ok(existsSync(`public${booster.front}`));assert.ok(existsSync(`public${booster.back}`));
  assert.deepEqual(collatePokemon('ecard2',booster.id,42,aquapolisCards).pulls,collatePokemon('ecard2','arcanine',42,[...aquapolisCards].reverse()).pulls);
 }
 assert.throws(()=>collatePokemon('ecard2','arcanine',1,aquapolisCards.slice(1)),/Incomplete/);
});

test('Prepared H geometry is separate, exact-source protection stays unchanged and inactive',()=>{
 const evidence=JSON.parse(readFileSync('public/cards/pokemon/aquapolis/mask-evidence.json','utf8'));
 assert.equal(evidence.length,32);
 for(const row of evidence){
  const path=`public/cards/pokemon/aquapolis/maps/${row.collectorNumber}-holo-protection.png`;
  assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),row.samSha256);
  assert.deepEqual(row.transform,{scale:[1,1],translation:[0,0],crop:null,flipY:false});
  const def=aquapolisDefinitions.find(c=>c.pokemon?.id===row.cardId)!;
  assert.equal(def.profile,'print-only');assert.equal(def.maps,undefined);
  assert.ok(existsSync(`public/cards/pokemon/aquapolis/maps/${row.collectorNumber}-holo-window.png`));
  assert.ok(existsSync(`public/cards/pokemon/aquapolis/maps/${row.collectorNumber}-cosmos.png`));
 }
});
