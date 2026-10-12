import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { tcglBwSets, tcglBwSurfaces } from '../src/pokemon/data/bw-tcgl.generated.ts';
import { svTcglCards } from '../src/pokemon/SvTcglCatalog.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';
import { bwRecipes, bwSupplementCards } from '../src/pokemon/BwRecipes.ts';
import { bwWrappers } from '../src/pokemon/data/bw-wrappers.generated.ts';
import { bwTeamPlasma } from '../src/pokemon/data/bw-plasma.generated.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { GalleryQueryIndex, compareGallerySetNames } from '../src/gallery/GalleryQuery.ts';
import { GalleryFavorites } from '../src/gallery/GalleryFavorites.ts';
import type { PrintVariant } from '../src/pokemon/types.ts';
const cards = svTcglCards.filter(c => c.seriesId === 'bw');
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

test('all exact BW printings and preserved orphan fronts remain distinct in gallery and favorites', () => {
  assert.equal(tcglBwSets.length, 15);
  assert.equal(tcglBwSurfaces.length, 2689);
  assert.equal(new Set(tcglBwSurfaces.map(s => `${s.cardId}:${s.variant}`)).size, 2689);
  const defs = tcglBwSurfaces.map(s => svTcglDefinition(s.cardId, s.variant as PrintVariant));
  const query = new GalleryQueryIndex(defs);
  assert.equal(query.filter({ search: '' }).length, 2689);
  const sorted = [...tcglBwSets].sort((a,b) => compareGallerySetNames(a.name,b.name));
  assert.deepEqual(sorted.map(s => s.releaseDate), sorted.map(s => s.releaseDate).sort());
  const favorites = new GalleryFavorites(); favorites.toggle('pokemon:bw1-1:reverse');
  assert.deepEqual(favorites.filter(query.filter({ search:'Snivy', set:'Black & White', finish:'reverse' }), true)
    .map(c => c.id), ['pokemon:bw1-1:reverse']);
  assert.equal(cards.find(c => c.id === 'bwbsp-29')!.category, 'Trainer');
  assert.equal(cards.find(c => c.id === 'bwbsp-77')!.name, 'Pikachu');
  assert.equal(cards.find(c => c.id === 'bwbsp-78')!.name, 'Raichu');
  for (const def of defs) {
    assert.ok(existsSync('public' + def.front), def.id);
    for (const map of Object.values(def.maps ?? {})) assert.ok(existsSync('public'+map), def.id+':'+map);
    assert.equal(def.mapSettings!.embossStrength, 0);
  }
});

test('RC and entirely gold cards stay eligible with original fronts and zero fabricated optics', () => {
  const rc = tcglBwSets.find(s => s.id === 'bw11r')!;
  assert.deepEqual(rc.cards.map(c => c.localId), Array.from({ length:25 }, (_,i) => `RC${i+1}`));
  for (const s of tcglBwSurfaces.filter(s => s.cardId.startsWith('bw11r-') || ['bw11-114','bw11-115'].includes(s.cardId))) {
    const def = svTcglDefinition(s.cardId,s.variant as PrintVariant);
    assert.equal(def.profile,'print-only'); assert.equal(s.treatmentStatus,'deferred');
    assert.deepEqual(def.maps,{});
  }
  for (const s of tcglBwSurfaces.filter(s => s.textured)) {
    const def = svTcglDefinition(s.cardId,s.variant as PrintVariant);
    assert.equal(def.profile,'prismatic_sir_texture'); assert.equal(def.mapSettings!.normalScale,1);
    assert.equal(def.profileOverrides!.diffraction!.followsAuthoredNormals,true);
    assert.equal(def.profileOverrides!.structure!.engraving,0);
    const ev = read('public'+s.evidence);
    assert.equal(ev.normalSource.outputDimensions.join('x'),'1800x2475');
    assert.equal(ev.normalSource.runtimeGeneration,false);
  }
  for (const id of ['bw1-113','bw1-114','bw2-97','bw2-98','bw3-100','bw4-100']) {
    const s = tcglBwSurfaces.find(s => s.cardId===id && s.variant==='holo')!;
    assert.equal(s.textured,false); assert.ok(!s.maps.normal);
  }
});

test('every original wrapper is correctly associated and every retail outcome uses exact eligible variants', () => {
  assert.equal(bwRecipes.length,12);
  assert.equal(Object.values(bwWrappers).flat().length,49);
  for (const [sid,wrappers] of Object.entries(bwWrappers)) for (const wrapper of wrappers) {
    assert.ok(existsSync('public'+wrapper.front));
    assert.ok(bwRecipes.find(r => r.setId===sid)!.boosterIds!.includes(wrapper.id));
  }
  for (const recipe of bwRecipes) {
    const pool = cards.filter(c => c.setId===recipe.setId).concat([...bwSupplementCards(recipe.setId)]);
    assert.ok(!pool.some(c => ['bwbsp','bwalt'].includes(c.setId)));
    for (const slot of recipe.slots) {
      assert.ok(Math.abs(slot.outcomes.reduce((n,o) => n+o.weight,0)-1)<1e-8);
      for (const o of slot.outcomes) for (const id of o.cardIds!) {
        const card = pool.find(c => c.id===id); assert.ok(card,id); assert.ok(card.variants.includes(o.variant));
      }
    }
    for (let seed=0;seed<160;seed++) {
      const result = collatePokemon(recipe.setId,recipe.boosterIds![0],seed,pool,recipe);
      assert.equal(result.pulls.length, recipe.setId==='bw6-5' ? 5 : 10);
      assert.deepEqual(result,collatePokemon(recipe.setId,recipe.boosterIds![0],seed,pool,recipe));
      if (recipe.setId==='bw6-5') assert.ok(result.pulls.every(p => p.variant==='holo'));
      if (recipe.setId==='bw11') assert.equal(result.pulls.filter(p => p.card.setId==='bw11r').length,2);
      for (const pull of result.pulls) {
        assert.ok(pull.card.variants.includes(pull.variant));
        if (pull.card.rarity==='ACE SPEC') assert.ok(pull.slot.startsWith('reverse-or-ace-spec'));
        if (pull.slot.startsWith('plasma-uncommon')) assert.ok(bwTeamPlasma[recipe.setId].includes(pull.card.id));
        if (pull.slot.startsWith('ordinary-uncommon')) assert.ok(!bwTeamPlasma[recipe.setId].includes(pull.card.id));
      }
    }
  }
});
