import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { tcglSwshSets, tcglSwshSurfaces } from '../src/pokemon/data/swsh-tcgl.generated.ts';
import { svTcglCards, svTcglSet } from '../src/pokemon/SvTcglCatalog.ts';
import { swshRecipes } from '../src/pokemon/SwshRecipes.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
const profileSources=readdirSync('src/materials/profiles').filter(n=>n.endsWith('.ts')).map(n=>readFileSync('src/materials/profiles/'+n,'utf8')).join('\n');

const cards=svTcglCards.filter(c=>c.seriesId==='swsh');
test('all extracted printings have distinct identities, exact assets and existing profiles',()=>{
  const index=JSON.parse(readFileSync('public/cards/pokemon/tcgl-swsh/printing-index.json','utf8')) as {tcglCardId:string;cardId:string;variant:string}[];
  assert.equal(tcglSwshSets.length,25);assert.equal(cards.length,3820);assert.equal(index.length,5853);
  assert.equal(new Set(index.map(c=>c.tcglCardId)).size,5853);
  assert.equal(new Set(index.map(c=>`${c.cardId}:${c.variant}`)).size,5853);
  const surfaces=new Map(tcglSwshSurfaces.map(s=>[`${s.cardId}:${s.variant}`,s]));
  for(const c of cards)for(const v of c.variants){
    const s=surfaces.get(`${c.id}:${v}`);assert.ok(s,`${c.id}:${v}`);assert.ok(profileSources.includes(`'${s.profile}'`),s.profile);
    assert.ok(existsSync('public'+c.front));
    for(const path of Object.values(s.maps))if(typeof path==='string')assert.ok(existsSync('public'+path),path);
    if(s.textured)assert.ok(s.maps.normal);
    if(s.foilType==='Cosmos')assert.ok(s.maps.motif);
  }
});
test('every set exposes all imported cards and real booster products only',()=>{
  for(const record of tcglSwshSets){const set=svTcglSet(record.id);assert.equal(set.cardIds.length,record.cards.length);assert.equal(set.boosters.length>0,swshRecipes.some(r=>r.setId===set.id));}
});
test('each booster collates 500 seeds without missing pools or illegal printings',()=>{
  assert.equal(swshRecipes.length,17);
  for(const recipe of swshRecipes){
    for(let seed=0;seed<500;seed++){
      const pack=collatePokemon(recipe.setId,recipe.boosterIds![0],seed,cards,recipe);
      assert.equal(pack.pulls.length,recipe.setId==='swsh7-5'?4:11);
      for(const p of pack.pulls){assert.ok(p.slot.startsWith('energy:') ? recipe.energyCards!.some(c=>c.id===p.card.id) : recipe.poolSetIds!.includes(p.card.setId));assert.ok(p.card.variants.includes(p.variant));assert.notEqual(p.card.setId,'swshalt');assert.notEqual(p.card.setId,'swshbsp');}
      if(recipe.setId==='swsh3-5'||recipe.setId==='swsh10-5')assert.equal(pack.pulls.find(p=>p.slot==='rare:1')!.variant,'holo');
      if(recipe.setId!=='swsh7-5') {
        assert.equal(recipe.energyCards!.length,8);
        const energy=pack.pulls.at(-1)!;
        assert.equal(energy.slot,'energy:1');assert.equal(energy.variant,'normal');
        assert.ok(existsSync('public'+energy.card.front));
        const year=['swsh9','swsh10','swsh10-5','swsh11','swsh12','swsh12-5'].includes(recipe.setId)?2022:2020;
        assert.ok(energy.card.id.startsWith(`swsh-energy-${year}-`));
      }
      if(recipe.setId==='swsh7-5')assert.ok(pack.pulls.every(p=>p.variant==='holo'));
    }
    // Force every supported branch, including very rare gallery and gold cards.
    for(const [slotIndex,slot] of recipe.slots.entries())for(const branch of slot.outcomes){
      const forced={...recipe,slots:recipe.slots.map((s,i)=>i===slotIndex?{...s,outcomes:[{...branch,weight:1}]}:s)};
      const pack=collatePokemon(recipe.setId,recipe.boosterIds![0],42,cards,forced);
      const pulled=pack.pulls.filter(p=>p.slot.startsWith(slot.id+':'));
      assert.ok(pulled.every(p=>branch.rarities.includes(p.card.rarity)));
    }
  }
});
