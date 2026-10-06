import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expeditionCards, expeditionSet } from '../src/pokemon/ExpeditionCatalog.ts';
import { expeditionDefinitions } from '../src/card/ExpeditionCards.ts';
import { cards } from '../src/card/CardDefinition.ts';
import { expeditionRecipe } from '../src/pokemon/ExpeditionProduct.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonCatalog } from '../src/pokemon/TcgdexAdapter.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';
import { filterCards } from '../src/gallery/GalleryQuery.ts';
import { wotcPrinting } from '../src/card/WotcCards.ts';

test('Expedition matches the independent numbered English checklist and exact front hashes', () => {
  const checklist = JSON.parse(readFileSync('scripts/expedition/checklist-independent.json','utf8'));
  const sources = JSON.parse(readFileSync('public/cards/pokemon/expedition/sources.json','utf8'));
  assert.equal(expeditionCards.length,165);
  assert.deepEqual(expeditionCards.map(c => c.id),Array.from({length:165},(_,i)=>`ecard1-${i+1}`));
  for (const card of expeditionCards) {
    const external = checklist.find((c: {id: string}) => c.id === card.id);
    assert.equal(card.name,external.name,card.id);
    // The basic Energies have no printed rarity icon; TCGdex assigns their common pool.
    if (Number(card.localId) < 160) assert.equal(card.rarity.replace('Holo Rare','Rare Holo'),external.rarity,card.id);
    const bytes = readFileSync(`public${card.front}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),sources.find((s: {cardId:string})=>s.cardId===card.id).sha256);
    assert.equal(bytes.readUInt32BE(16),600); assert.equal(bytes.readUInt32BE(20),825);
    assert.ok(existsSync(`public${card.thumbnail}`));
  }
});

test('324 distinct Expedition prints register once and reuse the existing viewer', async () => {
  assert.equal(expeditionDefinitions.length,324);
  assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);
  assert.equal(filterCards(cards,{search:'',set:'Expedition Base Set'}).length,324);
  for (const [finish,count] of [['normal',133],['reverse',159],['regular-holo',32]] as const)
    assert.equal(filterCards(cards,{search:'',set:'Expedition Base Set',finish}).length,count);
  for (const card of expeditionCards) {
    const n = Number(card.localId);
    assert.deepEqual(card.variants,n<=32 ? ['holo','reverse'] : n<=159 ? ['normal','reverse'] : ['normal']);
    for (const variant of card.variants) {
      const print = wotcPrinting(card.id,variant)!;
      assert.ok(print);
      assert.equal(pokemonDefinition(card,variant,cards).id,`pokemon:${card.id}:${variant}`);
      for (const path of Object.values(print.maps??{})) {
        assert.match(path!,/\.png$/); assert.ok(existsSync(`public${path}`),path);
      }
      assert.equal(print.proceduralFoil,undefined);
      if (variant==='holo') {
        assert.equal(print.profile,'pokemon-base-set-2-cosmos'); assert.equal(print.pokemon?.treatmentStatus,undefined);
        assert.equal(print.maps?.motif,`/cards/pokemon/expedition/maps/${n}-cosmos.png`);
        assert.equal(print.maps?.normal,undefined); assert.equal(print.maps?.height,undefined);
      } else if (variant==='reverse') assert.equal(print.profile,'pokemon-e-reader');
    }
  }
  const signal = new AbortController().signal;
  assert.deepEqual(await pokemonCatalog.set('ecard1',signal),expeditionSet);
  assert.equal((await pokemonCatalog.cards(expeditionSet,signal)).length,165);
});

test('Expedition packs preserve the non-holo rare and replace a common at the documented holo rate', () => {
  assert.equal(expeditionRecipe.slots.reduce((n,s)=>n+s.count,0),9);
  let holos=0; const reverses=new Set<string>(); const commons=new Set<string>();
  for (let seed=0;seed<3000;seed++) {
    const pack=collatePokemon('ecard1','charizard',seed,expeditionCards);
    assert.equal(pack.pulls.length,9);
    assert.equal(pack.pulls.filter(p=>p.slot.startsWith('rare:') && p.variant==='normal' && p.card.rarity==='Rare').length,1);
    assert.equal(pack.pulls.filter(p=>p.card.rarity==='Uncommon' && p.variant==='normal').length,2);
    const holo=pack.pulls.filter(p=>p.variant==='holo'); holos+=holo.length;
    const normalCommons=pack.pulls.filter(p=>p.variant==='normal' && p.card.rarity==='Common');
    assert.equal(normalCommons.length,holo.length ? 4 : 5); normalCommons.forEach(p=>commons.add(p.card.id));
    const reverse=pack.pulls.filter(p=>p.variant==='reverse'); assert.equal(reverse.length,1);
    assert.ok(Number(reverse[0].card.localId)<=159); reverses.add(reverse[0].card.id);
    assert.ok(!pack.pulls.some(p=>p.card.setId==='sve'));
  }
  assert.ok(holos>900 && holos<1100,`Observed ${holos}/3000 holos`);
  assert.equal(reverses.size,159);
  for (let n=160;n<=165;n++) assert.ok(commons.has(`ecard1-${n}`));
  for (const booster of expeditionSet.boosters) {
    assert.ok(existsSync(`public${booster.front}`)); assert.ok(existsSync(`public${booster.back}`));
    const pack=collatePokemon('ecard1',booster.id,42,expeditionCards);
    assert.deepEqual(pack.pulls,collatePokemon('ecard1','charizard',42,[...expeditionCards].reverse()).pulls);
  }
  assert.throws(()=>collatePokemon('ecard1','charizard',1,expeditionCards.slice(1)),/Incomplete/);
});
