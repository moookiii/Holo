import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { tcglSvSets } from '../src/pokemon/data/sv-tcgl.generated.ts';
import { tcglSvSurfaces } from '../src/pokemon/data/sv-tcgl-surfaces.generated.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';
import { canonicalProfileId } from '../src/materials/profiles/ProfileAliases.ts';
import { svTcglFront, svTcglSet } from '../src/pokemon/SvTcglCatalog.ts';

const counts = new Map([['sv04.5', 245], ['sv06.5', 99], ['sv10.5w', 173], ['sv10.5b', 172], ['svp', 216], ['svalt', 237], ['sve', 48]]);
const added = tcglSvSets.filter(set => counts.has(set.id));
const surfaces = new Map(tcglSvSurfaces.map(s => [`${s.cardId}:${s.variant}`, s]));
const publicFile = (path: string) => new URL(`../public${path}`, import.meta.url);

test('SVP nonfoil supplements remain browsable with truthful provenance and no inferred foil', () => {
  const promos = svTcglSet('svp');
  for (const n of [85, 102, 190, 213, 214, 225, 500]) {
    const id = `svp-${n}`;
    assert.ok(promos.cardIds.includes(id));
    assert.equal(promos.cardIds.filter(value => value === id).length, 1);
    const card = svTcglDefinition(id, 'normal');
    assert.equal(card.profile, 'print-only');
    assert.equal(card.pickerHidden, false);
    assert.deepEqual(card.pokemon?.variants, ['normal']);
    assert.equal(card.maps, undefined);
    assert.ok(existsSync(publicFile(card.front)));
    const evidence = JSON.parse(readFileSync(publicFile(card.source!.metadata!), 'utf8'));
    assert.equal(evidence.provider, [85, 102, 190].includes(n) ? 'User supplied' : 'TCGdex');
    assert.equal(evidence.variant, 'normal');
    assert.throws(() => svTcglDefinition(id, 'holo'), /Invalid TCGL printing/);
  }
});

test('missing SV products retain every exact printing and its own front/maps', () => {
  assert.equal(added.length, counts.size);
  const ids = new Set<string>();
  for (const set of added) {
    assert.equal(set.cards.length, counts.get(set.id), set.id);
    for (const card of set.cards) {
      assert.ok(!ids.has(card.id), card.id); ids.add(card.id);
      assert.equal(new Set(card.variants).size, card.variants.length);
      for (const variant of card.variants) {
        const front = svTcglFront(card.id, variant);
        assert.ok(existsSync(publicFile(front)), front);
        const definition = svTcglDefinition(card.id, variant);
        assert.equal(definition.front, front);
        assert.equal(definition.pokemon?.front, front);
        if (variant === 'normal') { assert.equal(definition.profile, 'print-only'); continue; }
        const surface = surfaces.get(`${card.id}:${variant}`);
        assert.ok(surface, `${card.id}:${variant}`);
        const evidence = JSON.parse(readFileSync(publicFile(surface.evidence), 'utf8'));
        assert.equal(evidence.cardId, card.id);
        assert.equal(evidence.variant, variant);
        assert.ok(evidence.tcglVariantId && evidence.exportUrl && evidence.exportEntry);
        for (const path of Object.values(surface.maps)) {
          assert.ok(path.endsWith('.png'), path);
          assert.ok(existsSync(publicFile(path)), path);
        }
        if (surface.textured) {
          assert.equal(definition.profile, 'prismatic_sir_texture');
          assert.equal(definition.mapSettings?.normalScale, 1);
          assert.equal(definition.mapSettings?.embossStrength, 0);
          assert.equal(definition.mapSettings?.roughnessMode, 'absolute');
          assert.equal(definition.profileOverrides?.structure?.relief, 0);
          assert.equal(definition.profileOverrides?.diffraction?.followsAuthoredNormals, true);
          assert.ok(surface.maps.normal); assert.equal(surface.maps.height, undefined);
        }
        if (surface.foilType === 'COSMOS') {
          assert.equal(surface.profile, 'svp-cosmos');
          assert.equal(surface.maps.motif, undefined); assert.equal(evidence.cosmosPlacement.status, 'shared-sheet');
        }
      }
    }
  }
  assert.equal(ids.size, 1190);
});

test('BW ball variants keep supplied basic/evolved patterns separate from their silver backing', () => {
  for (const id of ['sv10.5w-001', 'sv10.5b-001', 'sv10.5b-002']) {
    for (const variant of ['pokeball-reverse', 'masterball-reverse'] as const) {
      const surface = surfaces.get(`${id}:${variant}`); assert.ok(surface);
      const evidence = JSON.parse(readFileSync(publicFile(surface.evidence), 'utf8'));
      assert.match(evidence.tcglVariantId, /CastAndCure/);
      assert.equal(evidence.ballMask.status, 'applied');
      assert.equal(evidence.ballMask.layout, id === 'sv10.5b-002' ? 'evolved' : 'basic');
      assert.equal(evidence.ballMask.kind, variant === 'pokeball-reverse' ? 'poke' : 'master');
      assert.equal(surface.profile, variant === 'pokeball-reverse' ? 'bw-pokeball-reverse' : 'bw-masterball-reverse');
      assert.ok(surface.maps.pattern && surface.maps.direction);
      assert.notEqual(surface.maps.pattern, surface.maps.foil);
      assert.match(evidence.finishReview, /continuous silver/);
      assert.equal(surface.maps.normal, undefined);
    }
  }
});

test('SV Black Star illustration promos retain their exact TCGL treatment instead of ex defaults', () => {
  const promos = tcglSvSurfaces.filter(s => s.cardId.startsWith('svp-') && s.foilType === 'SUN_PILLAR' && !s.textured);
  let illustrationCount = 0;
  for (const s of promos) {
    const evidence = JSON.parse(readFileSync(publicFile(s.evidence), 'utf8'));
    const definition = svTcglDefinition(s.cardId, s.variant);
    if (evidence.tcglVariantId.includes('_IllustrationRare_')) {
      illustrationCount++;
      assert.equal(definition.profile, 'sv_tcgl_illustration_holo', s.cardId);
      assert.equal(definition.profileOverrides?.opticalModel, undefined, s.cardId);
      assert.equal(definition.maps, s.maps);
    } else {
      assert.match(evidence.tcglVariantId, /_DoubleRare_/);
      assert.equal(definition.profile, 'pokemon151_ex_holo', s.cardId);
      assert.equal(definition.profileOverrides?.opticalModel, undefined, s.cardId);
    }
  }
  assert.equal(illustrationCount, 29);
});

test('retired lower profile keeps Illustration Rare only for non-Double-Rare printings', () => {
  assert.equal(canonicalProfileId('sv_tcgl_ex_holo'), 'sv_tcgl_illustration_holo');
  assert.equal(canonicalProfileId('pokemon151_ex_holo'), 'pokemon151_ex_holo');
  let redirected = 0;
  for (const surface of tcglSvSurfaces.filter(s => s.profile === 'sv_tcgl_ex_holo')) {
    const evidence = JSON.parse(readFileSync(publicFile(surface.evidence), 'utf8'));
    assert.doesNotMatch(evidence.tcglVariantId, /_DoubleRareC?_/);
    const card = svTcglDefinition(surface.cardId, surface.variant);
    assert.equal(card.profile, 'sv_tcgl_illustration_holo');
    assert.equal(card.profileOverrides?.opticalModel, undefined);
    assert.equal(card.maps, surface.maps);
    redirected++;
  }
  assert.equal(redirected, 20);
});

test('exact smooth Double Rares use 151 Double Rare while etched and illustration sources stay distinct', () => {
  let smooth = 0, etched = 0;
  for (const surface of tcglSvSurfaces) {
    const evidence = JSON.parse(readFileSync(publicFile(surface.evidence), 'utf8'));
    if (!/_DoubleRareC?_/.test(evidence.tcglVariantId)) continue;
    const card = svTcglDefinition(surface.cardId, surface.variant);
    assert.equal(card.maps, surface.maps);
    if (!surface.textured && surface.foilType === 'SUN_PILLAR') {
      smooth++;
      assert.equal(card.profile, 'pokemon151_ex_holo', surface.cardId);
      assert.equal(card.profileOverrides, undefined);
      assert.equal(card.mapSettings?.normalScale, 0);
    } else if (surface.textured) {
      etched++;
      assert.notEqual(card.profile, 'sv_tcgl_illustration_holo', surface.cardId);
      assert.notEqual(card.profile, 'pokemon151_ex_holo', surface.cardId);
      assert.equal(card.mapSettings?.normalScale, 1);
      assert.equal(card.profileOverrides?.diffraction?.followsAuthoredNormals, true);
    }
  }
  assert.equal(smooth, 217);
  assert.ok(etched >= 40);
  for (const id of ['svp-27', 'svp-29']) {
    assert.equal(svTcglDefinition(id, 'holo').profile, 'sv_tcgl_illustration_holo');
  }
});
