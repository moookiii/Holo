import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { bwBallReverseProfiles } from '../src/materials/profiles/bwBallReverse.ts';
import { galleryOpticalLayers, galleryBatchKey } from '../src/gallery/GalleryBatch.ts';
import { tcglSvAdditionalSurfaces } from '../src/pokemon/data/sv-tcgl-additions-surfaces.generated.ts';

test('all 304 BW ball printings select their own supplied die and optical profile', () => {
  const records = tcglSvAdditionalSurfaces.filter(s => s.profile.startsWith('bw-'));
  assert.equal(records.length, 304);
  assert.equal(records.filter(s => s.profile === 'bw-pokeball-reverse').length, 160);
  for (const r of records) {
    const e = JSON.parse(readFileSync(`public${r.evidence}`, 'utf8'));
    const { ballMask: m } = e;
    const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
    assert.equal(hash(m.file), m.sha256);
    assert.equal(hash(m.optics.file), m.optics.sha256);
    assert.equal(r.maps.pattern, '/' + m.file.replace('public/', ''));
    assert.equal(r.maps.direction, '/' + m.optics.file.replace('public/', ''));
    assert.equal(r.maps.normal, undefined);
    assert.equal(r.maps.height, undefined);
    assert.equal(r.textured, false);
    assert.ok(r.maps.protection);
  }
});

test('ball optical batches are isolated from existing finishes and keep sparkle controls', () => {
  const p = new Float32Array(44 * 4); p[31] = 1; p[28 * 4 + 3] = 8;
  const generic = galleryBatchKey(galleryOpticalLayers(p));
  p[139] = 5;
  const layers = galleryOpticalLayers(p);
  assert.equal(layers[0].ballReverse, true);
  assert.equal(layers[0].glints, true);
  assert.equal(layers[1].ballReverse, undefined);
  assert.notEqual(galleryBatchKey(layers), generic);
  for (const profile of bwBallReverseProfiles) {
    assert.equal(profile.opticalModel, 'sv-ball-reverse');
    assert.equal(profile.structure.relief, 0);
    assert.equal(profile.mapSettings?.normalScale, 0);
    assert.equal(profile.mapSettings?.embossStrength, 0);
    assert.ok(profile.glints.strength > 0 && profile.diffraction.strength > 0);
  }
});
