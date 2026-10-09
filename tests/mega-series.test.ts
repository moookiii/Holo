import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { tcglMegaSets,tcglMegaSurfaces } from '../src/pokemon/data/mega-tcgl.generated.ts';
import { svTcglCards,svTcglSet } from '../src/pokemon/SvTcglCatalog.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { megaRecipes,megaGodConfigurations } from '../src/pokemon/MegaRecipes.ts';
import { filterCards,compareGallerySetNames } from '../src/gallery/GalleryQuery.ts';
import { pokemonDefinition } from '../src/pokemon/materials.ts';

const counts: Record<string,[number,number]>={me01:[188,310],me02:[130,214],'me02.5':[295,613],me03:[124,203],me04:[122,198],me05:[120,194]};
const file=(url:string)=>new URL('../public'+url,import.meta.url);
test('all six complete TCGL checklists retain every exact printing and its local assets',()=>{
  let printings=0,etched=0,reserved=0;
  for(const [id,[cards,variants]] of Object.entries(counts)){
    const set=tcglMegaSets.find(s=>s.id===id)!;assert.ok(set);assert.equal(set.cards.length,cards);
    assert.equal(set.cards.reduce((n,c)=>n+c.variants.length,0),variants);
    assert.equal(new Set(set.cards.map(c=>c.id)).size,cards);
    const surfaces=tcglMegaSurfaces.filter(s=>s.cardId.startsWith(id+'-'));
    for(const card of set.cards) for(const variant of card.variants){
      const definition=svTcglDefinition(card.id,variant);assert.ok(existsSync(file(definition.front)));printings++;
      if(variant==='normal'){assert.equal(definition.profile,'print-only');continue;}
      const surface=surfaces.find(s=>s.cardId===card.id&&s.variant===variant)!;assert.ok(surface);
      const evidence=JSON.parse(readFileSync(file(surface.evidence),'utf8'));
      assert.equal(evidence.tcglVariantId,surface.tcglVariantId);
      assert.equal(evidence.tcglCardId,evidence.exportSource?evidence.sources.front.file.split('/').at(-2)?.replace(id+'-',id+'-')&&evidence.tcglCardId:undefined);
      assert.ok(evidence.exportSource.sha256);assert.equal(evidence.alignmentReview.verticalFlip,false);assert.equal(evidence.alignmentReview.cropOrOffset,false);
      for(const url of Object.values(surface.maps))assert.ok(url.endsWith('.png')&&existsSync(file(url)));
      assert.equal(definition.mapSettings?.embossStrength,0);assert.equal(surface.maps.height,undefined);
      if(surface.textured){etched++;assert.equal(definition.profile,'prismatic_sir_texture');assert.equal(definition.mapSettings?.normalScale,1);
        assert.equal(definition.mapSettings?.roughnessMode,'absolute');assert.equal(definition.profileOverrides?.diffraction?.followsAuthoredNormals,true);
        assert.equal(definition.profileOverrides?.mapSettings?.embossMaskFromNormalAlpha,false);
        assert.equal(definition.profileOverrides?.structure?.normalVariance,0);assert.equal(definition.profileOverrides?.glints?.strength,0);
        assert.ok(evidence.bodyMask.sha256);assert.match(evidence.normalMethod,/Scharr scale 1\/32; gain 1.03/);
        assert.deepEqual(evidence.mapDimensions[surface.maps.normal!.split('/').at(-1)!],[1800,2475]);
      }
      if(card.rarity==='Mega Attack Rare'||card.rarity==='Mega Hyper Rare'){reserved++;assert.equal(definition.pokemon?.treatmentStatus,'deferred');assert.match(definition.source!.notes!,/Astra High/);}
    }
  }
  assert.equal(printings,1732);assert.equal(etched,221);assert.equal(reserved,15);
});

test('every wrapper collates only exact eligible printings with Mega Energy and stable cosmetic-art pulls',()=>{
  assert.equal(megaRecipes.length,6);
  for(const recipe of megaRecipes){
    const set=svTcglSet(recipe.setId);assert.equal(set.era,'me');
    assert.equal(set.boosters.length,set.id==='me02.5'?1:4);
    assert.equal(recipe.requiredCardIds?.length,counts[set.id][0]);
    for(const booster of set.boosters){assert.ok(booster.front&&existsSync(file(booster.front)));
      const pack=collatePokemon(set.id,booster.id,5,svTcglCards);assert.equal(pack.pulls.length,11);
      assert.deepEqual(pack.pulls,collatePokemon(set.id,set.boosters[0].id,5,svTcglCards).pulls);
      assert.deepEqual(pack,collatePokemon(set.id,booster.id,5,[...svTcglCards].reverse()));
      for(const pull of pack.pulls){assert.ok(pull.card.variants.includes(pull.variant));const definition=pokemonDefinition(pull.card,pull.variant,[]);assert.ok(existsSync(file(definition.front)));}
      assert.equal(pack.pulls.at(-1)?.card.setId,'mee');assert.equal(pack.pulls.at(-1)?.variant,'normal');
      assert.deepEqual(pack.pulls.slice(0,4).map(p=>p.card.rarity),Array(4).fill('Common'));
      assert.deepEqual(pack.pulls.slice(4,7).map(p=>p.card.rarity),Array(3).fill('Uncommon'));
    }
    assert.throws(()=>collatePokemon(set.id,set.boosters[0].id,1,svTcglCards.filter(c=>c.id!==set.cardIds[0])),/Incomplete/);
  }
});

test('Ascended fallback keeps plain Trainers eligible alongside assigned ph2 Pokemon; MAR replaces rare and God odds remain separate',()=>{
  const recipe=megaRecipes.find(r=>r.setId==='me02.5')!;
  const slot=recipe.slots.find(s=>s.id==='reverse-replacement')!;
  for(const category of ['Trainer','Pokemon']){
    const card=svTcglCards.find(c=>c.setId==='me02.5'&&c.category===category&&c.variants.includes(category==='Pokemon'?'special-reverse':'reverse'))!;
    const forced={...recipe,slots:[{...slot,outcomes:[{...slot.outcomes[0],weight:1,cardIds:[card.id]}]}]};
    const pack=collatePokemon('me02.5','standard',1,svTcglCards,forced);
    assert.equal(pack.pulls[0].variant,category==='Pokemon'?'special-reverse':'reverse');
  }
  assert.ok(recipe.slots.find(s=>s.id==='rare')!.outcomes.some(o=>o.rarities.includes('Mega Attack Rare')));
  const god=megaGodConfigurations[0];assert.ok(!megaRecipes.includes(god));
  const pack=collatePokemon('me02.5','standard',1,svTcglCards,god);
  assert.deepEqual(pack.pulls.slice(0,3).map(p=>p.card.rarity),Array(3).fill('Mega Attack Rare'));
  assert.deepEqual(pack.pulls.slice(3,10).map(p=>p.card.rarity),Array(7).fill('Special Illustration Rare'));
  assert.equal(new Set(pack.pulls.slice(0,10).map(p=>p.card.id)).size,10);assert.equal(pack.pulls.length,11);
});

test('gallery supports special reverses and release order through the anniversary sets',()=>{
  const order=['Mega Evolution','Phantasmal Flames','Ascended Heroes','Perfect Order','Chaos Rising','Pitch Black','30th Celebration'];
  assert.deepEqual([...order].reverse().sort(compareGallerySetNames),order);
  const card=svTcglDefinition('me02.5-001','special-reverse');
  assert.equal(filterCards([card],{search:'',finish:'holo'}).length,1);
});
