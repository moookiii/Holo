import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { svTcglPickerCards } from '../src/pokemon/SvTcglSurfaces.ts';
import { pokemon151PickerCards } from '../src/pokemon/Pokemon151Surfaces.ts';
import { prismaticPickerCards } from '../src/pokemon/PrismaticSurfaces.ts';
import { goldEtchedFinish } from '../src/materials/profiles/goldEtchedFinish.ts';
import { tcglEtchedFinish } from '../src/materials/profiles/tcglEtchedFinish.ts';
import { galleryBatchKey, galleryOpticalLayers } from '../src/gallery/GalleryBatch.ts';

const cards = [...svTcglPickerCards(), ...pokemon151PickerCards(), ...prismaticPickerCards()];
const gold = cards.filter(card => card.profile.endsWith('_gold') && card.maps?.normal);
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

test('every exact gold printing opts into the finish without changing the TCGL die or print assets', () => {
  assert.ok(gold.length > 50);
  assert.ok(gold.some(card => card.id === 'pokemon:sv04-265:holo'));
  for (const card of gold) {
    assert.equal(card.profileOverrides, goldEtchedFinish, card.id);
    assert.equal(card.mapSettings?.normalScale, 1);
    assert.equal(card.mapSettings?.embossStrength, 0);
    assert.equal(card.mapSettings?.roughnessMode, 'absolute');
    assert.equal(card.maps?.height, undefined);
    const evidence = JSON.parse(readFileSync(`public${card.maps!.normal!.replace('-normal.png', '-evidence.json')}`, 'utf8'));
    assert.equal(hash(`public${card.front}`), evidence.holoFrontSha256 ?? evidence.alignmentReview.holoFrontSha256, card.id);
    for (const path of Object.values(card.maps!)) {
      assert.equal(hash(`public${path}`), evidence.maps[path.split('/').at(-1)!], `${card.id}: ${path}`);
    }
    assert.deepEqual(evidence.mapSize, [1800, 2475]);
    assert.match(evidence.tcglVariantId, /_HyperRare(?:BasicEnergy)?_.*_Etched$/);
  }
});

test('gold calibration stays isolated from SIR, Ultra Rare, ex and smooth gold printings', () => {
  for (const card of cards.filter(card => !gold.includes(card))) {
    assert.notEqual(card.profileOverrides, goldEtchedFinish, card.id);
    assert.equal(card.profileOverrides?.diffraction?.normalFiltering, undefined, card.id);
  }
  assert.deepEqual(goldEtchedFinish.mapSettings, tcglEtchedFinish.mapSettings);
  assert.deepEqual(goldEtchedFinish.structure, tcglEtchedFinish.structure);
  assert.equal(goldEtchedFinish.glints?.metallicGrain, true);
  assert.equal(goldEtchedFinish.glints?.density, 1);
  assert.equal(tcglEtchedFinish.glints?.strength, 0);
  assert.equal(tcglEtchedFinish.surface?.metalness, .5);
  assert.equal(tcglEtchedFinish.diffraction?.strength, .48);
});

test('filtered gallery programs cannot contaminate generic, secret or disabled batches', () => {
  const p = new Float32Array(44 * 4); p[31] = 1;
  const plain = galleryBatchKey(galleryOpticalLayers(p));
  p[37 * 4 + 2] = 1;
  assert.notEqual(galleryBatchKey(galleryOpticalLayers(p)), plain);
  assert.equal(galleryOpticalLayers(p)[0].normalFiltering, true);
  const filtered = galleryBatchKey(galleryOpticalLayers(p));
  p[29 * 4 + 3] = -1;
  assert.notEqual(galleryBatchKey(galleryOpticalLayers(p)), filtered);
  assert.equal(galleryOpticalLayers(p)[0].metallicGrain, true);
  p[37 * 4] = 120;
  assert.equal(galleryOpticalLayers(p)[0].normalFiltering, undefined);
  p[31] = 0;
  assert.equal(galleryBatchKey(galleryOpticalLayers(p)), '---');
});
