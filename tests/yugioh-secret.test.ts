import test from 'node:test';
import assert from 'node:assert/strict';
import { yugiohProfiles } from '../src/materials/profiles/yugioh.ts';
import { yugiohPrintingProfile } from '../src/materials/profiles/YugiohPrinting.ts';
import { deserializeProfile, serializeProfile } from '../src/lab/ProfileCodec.ts';

test('Secret printing selection distinguishes original-era and later manufacturing without guessing from a set code', () => {
  assert.equal(yugiohPrintingProfile({ rarity: 'Secret Rare', era: 'early-tcg' }), 'ygo-secret-early-tcg');
  assert.equal(yugiohPrintingProfile({ rarity: 'Secret Rare', era: 'later-tcg' }), 'ygo-secret');
  assert.equal(yugiohPrintingProfile({ rarity: 'Secret Rare', era: 'early-tcg', materialProfile: 'ygo-secret' }), 'ygo-secret');
});

test('Secret profiles preserve their die parameters through Lab serialization and keep title optics independent', () => {
  for (const id of ['ygo-secret', 'ygo-secret-early-tcg']) {
    const p = yugiohProfiles.find(p => p.id === id)!;
    const roundTrip = deserializeProfile(serializeProfile(p));
    assert.deepEqual(roundTrip, p);
    assert.equal(p.glints.strength, 0);
    assert.equal(p.structure.reflectionCoupling, 0);
    assert.equal(p.mapSettings?.embossStrength, 0);
    assert.equal(p.surface.inkTransmission, 1);
    assert.equal(p.secondary?.structure.field, 'plain');
    assert.notEqual(p.secondary?.diffraction.direction, p.diffraction.direction);
    assert.ok(p.secondary!.surface.metalness > p.surface.metalness);
    assert.equal(p.extendedCoverage, undefined);
  }
  const early = yugiohProfiles.find(p => p.id === 'ygo-secret-early-tcg')!;
  const later = yugiohProfiles.find(p => p.id === 'ygo-secret')!;
  assert.notEqual(early.structure.scale, later.structure.scale);
  assert.notStrictEqual(early.secondary, later.secondary);
});

test('other Yu-Gi-Oh foil families retain independent treatments', () => {
  for (const id of ['ygo-prismatic-secret', 'ygo-starlight', 'ygo-quarter-century']) {
    const p = yugiohProfiles.find(p => p.id === id)!;
    assert.notEqual(p.structure.field, 'secret');
  }
});
