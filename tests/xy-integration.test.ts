import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { tcglXySets, tcglXySurfaces } from '../src/pokemon/data/xy-tcgl.generated.ts';
import { svTcglCards, svTcglSet } from '../src/pokemon/SvTcglCatalog.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';
import { xyRecipes } from '../src/pokemon/XyRecipes.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import type { PrintVariant } from '../src/pokemon/types.ts';
const cards = svTcglCards.filter(c => c.seriesId === 'xy');

test('all 3416 exact XY source variants remain selectable with their own assets', () => {
  const index = JSON.parse(readFileSync('public/cards/pokemon/tcgl-xy/printing-index.json', 'utf8'));
  assert.equal(index.length, 3416);
  assert.equal(new Set(index.map((p: any) => p.tcglCardId)).size, 3416);
  assert.equal(new Set(tcglXySurfaces.map(s => `${s.cardId}:${s.variant}`)).size, 3416);
  for (const s of tcglXySurfaces) {
    const card = cards.find(c => c.id === s.cardId)!;
    assert.ok(card?.variants.includes(s.variant as PrintVariant));
    const def = svTcglDefinition(s.cardId, s.variant as PrintVariant);
    assert.ok(existsSync('public' + def.front));
    const evidence = JSON.parse(readFileSync('public' + s.evidence, 'utf8'));
    assert.equal(evidence.tcglVariantId, s.tcglVariantId);
    for (const path of [...Object.values(s.originalAssets), ...Object.values(s.maps)]) assert.ok(existsSync('public' + path));
    assert.equal(def.mapSettings?.embossStrength, 0);
    assert.equal(def.maps?.height, undefined);
    if (s.deferredEffect) {
      assert.equal(def.profile, 'print-only');
      assert.equal(def.pokemon?.treatmentStatus, 'deferred');
      assert.deepEqual(def.maps, {});
      assert.match(def.number, /finish pending/);
    } else if (s.variant !== 'normal') assert.ok(def.maps?.foilControls);
  }
});

test('18 chronological XY collections expose only 14 real booster products and 54 designs', () => {
  assert.equal(tcglXySets.length, 18);
  assert.equal(xyRecipes.length, 14);
  assert.equal(xyRecipes.reduce((n,r) => n + r.boosterIds!.length, 0), 54);
  assert.deepEqual(tcglXySets.map(s => s.releaseDate), tcglXySets.map(s => s.releaseDate).sort());
  for (const s of tcglXySets) {
    const set = svTcglSet(s.id);
    assert.equal(set.cardIds.length, s.cards.length);
    assert.equal(set.boosters.length > 0, xyRecipes.some(r => r.setId === s.id));
    for (const b of set.boosters) assert.ok(existsSync('public' + b.front?.split('?')[0]));
  }
});

test('XY packs resolve exact variants, seven-card Double Crisis, and two Generations RC slots', () => {
  for (const recipe of xyRecipes) {
    for (let seed = 0; seed < 300; seed++) {
      const pack = collatePokemon(recipe.setId, recipe.boosterIds![seed % recipe.boosterIds!.length], seed, cards, recipe);
      assert.equal(pack.pulls.length, recipe.setId === 'xy5-5' ? 7 : 10);
      for (const p of pack.pulls) {
        assert.ok(p.card.variants.includes(p.variant));
        assert.ok(recipe.poolSetIds!.includes(p.card.setId));
        assert.ok(!['xyalt','xybsp','xy0'].includes(p.card.setId));
        if (p.card.rarity === 'BREAK Rare') assert.equal(p.slot, 'reverse:1');
      }
      if (recipe.setId === 'xy5-5') assert.equal(pack.pulls[4].variant, 'holo');
      if (recipe.setId === 'xy9-5') {
        assert.deepEqual(pack.pulls.map(p => p.slot), ['common:1','common:2','common:3','common:4','reverse:1','radiant-premium:1','rare:1','radiant-common:1','uncommon:1','uncommon:2']);
        assert.equal(pack.pulls.filter(p => p.card.setId === 'xy9-5r').length, 2);
        assert.equal(pack.pulls[5].variant, 'holo');
        assert.equal(pack.pulls[7].variant, 'normal');
      }
      if (recipe.setId === 'xy12') {
        const secrets = pack.pulls.filter(p => p.card.rarity === 'Secret Rare');
        assert.ok(secrets.length <= 2);
        assert.ok(secrets.every(p => p.variant === 'normal' && p.slot.startsWith('uncommon:')));
      }
    }
    for (const [i, slot] of recipe.slots.entries()) for (const branch of slot.outcomes) {
      const forced = {...recipe, slots: recipe.slots.map((s,j) => i === j ? {...s,outcomes:[{...branch,weight:1}]} : s)};
      const pack = collatePokemon(recipe.setId, recipe.boosterIds![0], 42, cards, forced);
      assert.ok(pack.pulls.filter(p => p.slot.startsWith(slot.id + ':')).every(p => branch.cardIds!.includes(p.card.id) && p.variant === branch.variant));
    }
  }
});
