import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { tcglSvSets } from '../src/pokemon/data/sv-tcgl.generated.ts';
import { tcglSvSurfaces } from '../src/pokemon/data/sv-tcgl-surfaces.generated.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';
import { svTcglFront } from '../src/pokemon/SvTcglCatalog.ts';

const counts = new Map([['sv04.5', 245], ['sv06.5', 99], ['sv10.5w', 173], ['sv10.5b', 172], ['svp', 216], ['svalt', 237], ['sve', 48]]);
const added = tcglSvSets.filter(set => counts.has(set.id));
const surfaces = new Map(tcglSvSurfaces.map(s => [`${s.cardId}:${s.variant}`, s]));
const publicFile = (path: string) => new URL(`../public${path}`, import.meta.url);

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
          assert.equal(surface.profile, 'pokemon-base-set-2-cosmos');
          assert.ok(surface.maps.motif); assert.equal(evidence.cosmosPlacement.status, 'pending');
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
