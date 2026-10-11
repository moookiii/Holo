import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { tcglSmSets, tcglSmSurfaces } from '../src/pokemon/data/sm-tcgl.generated.ts';
import { svTcglCards, svTcglSet } from '../src/pokemon/SvTcglCatalog.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';
import { smRecipes, smPackEnergy } from '../src/pokemon/SmRecipes.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { tcglEtchedFinish } from '../src/materials/profiles/tcglEtchedFinish.ts';
const pilot = process.env.SM_PILOT === '1';
const cards = svTcglCards.filter(c => c.seriesId === 'sm');
const expected = pilot ? 325 : 5010;

test('every exact source printing maps to one valid Holo printing without collapse', () => {
  const index = JSON.parse(readFileSync('public/cards/pokemon/tcgl-sm/printing-index.json', 'utf8')) as {tcglCardId:string|null;tcglVariantId:string|null;sourceIdentifier?:string;cardId:string;variant:string}[];
  assert.equal(index.length, expected);
  assert.equal(new Set(index.map(p => p.tcglCardId ?? p.sourceIdentifier)).size, expected);
  assert.equal(new Set(index.map(p => `${p.cardId}:${p.variant}`)).size, expected);
  assert.equal(tcglSmSurfaces.length, expected);
  const source = JSON.parse(readFileSync('research/tcgl/sun-moon-series/dataset/manifest.json', 'utf8'));
  for (const p of index) {
    const surface = tcglSmSurfaces.find(s => s.cardId === p.cardId && s.variant === p.variant)!;
    assert.ok(surface); assert.equal(surface.tcglVariantId, p.tcglVariantId);
    assert.ok(cards.find(c => c.id === p.cardId)?.variants.includes(p.variant as 'normal'));
    if (p.tcglCardId && !p.tcglCardId.startsWith('ec_')) assert.equal(source.find((s:{card_id:string}) => s.card_id === p.tcglCardId).long_form_id, p.tcglVariantId);
    for (const path of Object.values(surface.maps)) assert.ok(existsSync('public' + path), `${p.tcglCardId} ${path}`);
    const def = svTcglDefinition(p.cardId, p.variant as 'normal');
    assert.ok(existsSync('public' + def.front));
    assert.equal(def.mapSettings?.embossStrength, 0);
    assert.equal(def.mapSettings?.embossMaskFromNormalAlpha, false);
    if (surface.textured) {
      assert.ok(def.maps?.normal); assert.equal(def.mapSettings?.normalScale, 1);
      assert.equal(def.mapSettings?.roughnessMode, 'absolute');
      assert.deepEqual(def.profileOverrides, tcglEtchedFinish);
      assert.equal(def.maps?.height, undefined);
    }
    if (surface.deferredEffect === 'Prism Star') {
      assert.equal(def.profile, 'pokemon-sm-prism-star');
      assert.equal(def.pokemon?.treatmentStatus, undefined);
      assert.doesNotMatch(def.number, /finish pending/);
      assert.equal(def.mapSettings?.roughnessMode, 'profile');
      assert.equal(def.stockSurface?.strength, 0);
      assert.ok(def.maps?.extendedFoil && existsSync('public' + def.maps.extendedFoil));
    } else if (surface.deferredEffect) {
      assert.ok(['Sun & Moon Reverse Holo', 'Prism Star'].includes(surface.deferredEffect));
      assert.equal(def.pokemon?.treatmentStatus, 'deferred');
      assert.match(def.source!.notes!, /provisional/);
    } else assert.equal(def.pokemon?.treatmentStatus, undefined);
  }
});
test('all expansions use chronological local catalogs and real wrapper variants', () => {
  assert.equal(smRecipes.length, pilot ? 1 : 16);
  for (const s of tcglSmSets) {
    const set = svTcglSet(s.id);
    assert.equal(set.cardIds.length, s.cards.length);
    assert.equal(set.boosters.length > 0, smRecipes.some(r => r.setId === s.id));
    for (const booster of set.boosters) assert.ok(existsSync('public' + booster.front?.split('?')[0]));
  }
  if (!pilot) {
    const vault = cards.filter(c => c.setId === 'sm11-5' && c.localId.startsWith('SV'));
    assert.equal(vault.length, 94); assert.deepEqual(new Set(vault.map(c => c.localId)), new Set(Array.from({length:94}, (_,i) => `SV${i+1}`)));
    assert.equal(cards.filter(c => c.setId === 'sm12' && c.rarity === 'Character Rare').length, 12);
  }
});
test('all wrapper designs collate lawful sealed packs, with era-specific Energy and special slots', () => {
  for (const recipe of smRecipes) {
    const count = recipe.setId === 'gum' ? 4 : 11;
    const seedCount = 500;
    for (let seed = 0; seed < seedCount; seed++) {
      const pack = collatePokemon(recipe.setId, recipe.boosterIds![seed % recipe.boosterIds!.length], seed, cards, recipe);
      assert.equal(pack.pulls.length, count);
      for (const p of pack.pulls) {
        assert.ok(p.card.variants.includes(p.variant));
        assert.ok(p.card.setId === recipe.setId || p.card.setId === 'sm-energy');
        assert.ok(!['smalt', 'smbsp'].includes(p.card.setId));
        const special = p.card.localId.startsWith('SV') || ['Prism Star', 'Character Rare'].includes(p.card.rarity);
        if (special) assert.equal(p.slot, 'reverse-replacement:1');
      }
      if (recipe.setId === 'gum') {
        assert.deepEqual(pack.pulls.map(p => p.variant), ['holo','holo','holo','holo']);
        assert.deepEqual(pack.pulls.map(p => p.slot), ['common:1','common:2','common:3','rare:1']);
      } else {
        assert.deepEqual(pack.pulls.map(p => p.slot), ['common:1','common:2','common:3','common:4','common:5','reverse-replacement:1','rare:1','energy:1','uncommon:1','uncommon:2','uncommon:3']);
        assert.equal(pack.pulls[7].variant, 'normal');
        assert.ok(smPackEnergy(recipe.setId).some(c => c.id === pack.pulls[7].card.id));
        assert.equal(smPackEnergy(recipe.setId).length, 9);
        assert.ok(smPackEnergy(recipe.setId).some(c => c.types?.includes('Fairy')));
        if (['sm3-5','sm7-5'].includes(recipe.setId)) assert.equal(pack.pulls[6].variant, 'holo');
      }
    }
    // Force each branch so low-probability gold, Prism, SV and character pools
    // cannot remain untested merely because a random sample missed them.
    for (const [slotIndex, slot] of recipe.slots.entries()) for (const branch of slot.outcomes) {
      const forced = {...recipe, slots: recipe.slots.map((s,i) => i === slotIndex ? {...s,outcomes:[{...branch,weight:1}]} : s)};
      const result = collatePokemon(recipe.setId, recipe.boosterIds![0], 1234, cards, forced);
      assert.ok(result.pulls.filter(p => p.slot.startsWith(slot.id + ':')).every(p => branch.cardIds!.includes(p.card.id) && p.variant === branch.variant));
    }
  }
});
