import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tcgl151Surfaces } from '../src/pokemon/data/151-surfaces.generated.ts';
import { galleryOpticalLayers, galleryBatchKey, galleryPreviewOpticalLayers } from '../src/gallery/GalleryBatch.ts';
import { pokemon151Definition } from '../src/pokemon/Pokemon151Surfaces.ts';

test('all seven 151 SIRs retain byte-identical art, authoritative masks and exact TCGL relief', () => {
  const cards = tcgl151Surfaces.filter(s => s.profile === 'pokemon151_sir_texture');
  assert.equal(cards.length, 7);
  for (const card of cards) {
    const evidence = JSON.parse(readFileSync(`public${card.evidence}`, 'utf8'));
    assert.match(evidence.tcglVariantId, /_SpecialIllustrationRare_SvUltra_Etched$/);
    assert.deepEqual(evidence.mapSize, [1800, 2475]);
    assert.equal(card.maps.height, undefined);
    const definition = pokemon151Definition(card.cardId, 'holo');
    assert.ok(definition.mapSettings!.normalScale! > 0 && definition.mapSettings!.normalScale! < .2);
    assert.equal(definition.mapSettings?.embossStrength, 0);
    assert.equal(definition.profileOverrides, undefined, 'legacy finish cannot override the SIR profile');
    const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
    for (const path of Object.values(card.maps))
      assert.equal(hash(`public${path}`), evidence.maps[path.split('/').at(-1)!], `${card.cardId}: ${path}`);
    assert.equal(hash(`public/cards/pokemon/151/${card.cardId.split('-').at(-1)}.png`), evidence.holoFrontSha256);
    for (const name of ['front', 'etch']) {
      const source = evidence.sources[name];
      assert.match(source.url, /cdn\.malie\.io/);
    }
  }
});

test('SIR cannot share an IR, Ultra, Double Rare or generic shader batch, and still obeys coverage', () => {
  const parameters = new Float32Array(44 * 4); parameters[31] = 1;
  const keys = [0, 1, 2, 3, 4].map(model => {
    parameters[139] = model;
    return galleryBatchKey(galleryOpticalLayers(parameters));
  });
  assert.equal(new Set(keys).size, 5);
  const layers = galleryOpticalLayers(parameters);
  assert.equal(layers[0].specialIllustration, true);
  assert.equal(layers[1].specialIllustration, undefined);
  const images = [new Uint8Array(4), new Uint8Array(4)];
  assert.equal(galleryBatchKey(galleryPreviewOpticalLayers(parameters, images)), '---');
  images[1][0] = 1;
  assert.equal(galleryBatchKey(galleryPreviewOpticalLayers(parameters, images)), 'p--');
});
