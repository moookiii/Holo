import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewOptics } from '../src/card/PreviewOptics.ts';
import { tcglEtchedFinish } from '../src/materials/profiles/tcglEtchedFinish.ts';
import type { CardDefinition } from '../src/card/CardDefinition.ts';
import type { HolographicProfile } from '../src/materials/HolographicProfile.ts';

const card = { id: 'etch-fixture', franchise: 'Pokémon', seed: 1,
  dimensions: { width: 6.3, height: 8.8 }, maps: { normal: '/exact-card-normal.png' },
  mapSettings: { normalScale: 1, embossStrength: 0, roughnessMode: 'absolute' } } as CardDefinition;
const profile = { ...tcglEtchedFinish, id: 'fixture' } as HolographicProfile;

test('authored etching retains the viewer ridge response without an explicit filtering setting', () => {
  const packed = previewOptics(card, profile);
  assert.ok(Math.abs(packed[37 * 4 + 1] - .85) < 1e-6);
  assert.equal(packed[37 * 4 + 2], 1);
  assert.equal(packed[11], 1, 'Diffraction follows the authored surface');
  assert.equal(packed[28 * 4 + 3], 0, 'No extra primary sparkle');
  assert.equal(packed[30 * 4 + 3], 10, 'Separate microdiamond finish retains its response');
});

test('a missing normal does not invent authored filtering, while a profile normal still enables it', () => {
  const noNormal = { ...card, maps: {} };
  assert.equal(previewOptics(noNormal, profile)[37 * 4 + 2], 0);
  assert.equal(previewOptics(noNormal, { ...profile, maps: { normal: '/own-profile-normal.png' } })[37 * 4 + 2], 1);
});

test('secret-cut controls retain their independent packed row', () => {
  const secret = { ...profile, structure: { ...profile.structure, field: 'secret' as const, scale: 112 } };
  const packed = previewOptics(card, secret);
  assert.equal(packed[37 * 4], 112);
  assert.ok(Math.abs(packed[37 * 4 + 1] - Math.PI / 4) < 1e-6);
});
