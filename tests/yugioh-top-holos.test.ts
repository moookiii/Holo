import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { nonHoloCards } from '../src/card/NonHoloCards.ts';
import { holoBulkCards } from '../src/card/HoloBulkCards.ts';
import { yugiohTopCards, yugiohTopCardIds } from '../src/card/YugiohTopCards.ts';
import { holographicCardIds } from '../src/pack/PackDefinition.ts';

test('the current Yu-Gi-Oh usage batch contains 50 new holo-eligible cards', () => {
  assert.equal(yugiohTopCards.length, 50);
  const existing = new Set([...nonHoloCards, ...holoBulkCards].map(card => card.title.toLocaleLowerCase()));
  const added = new Set<string>();
  for (const card of yugiohTopCards) {
    const title = card.title.toLocaleLowerCase();
    assert.ok(!existing.has(title), `${card.title} already exists`);
    assert.ok(!added.has(title), `${card.title} is duplicated`);
    assert.notEqual(card.profile, 'print-only');
    assert.match(card.set, /(Rare|Rare')/);
    added.add(title);
  }
});

test('every prepared front and registration map exists at standard resolution', () => {
  const jpegSize = (path: string) => {
    const bytes = readFileSync(path); let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      const marker = bytes[offset + 1], length = bytes.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
      offset += 2 + length;
    }
    throw new Error(`No JPEG dimensions in ${path}`);
  };
  for (const card of yugiohTopCards) {
    assert.deepEqual(jpegSize(`public${card.front.split('?')[0]}`), [813, 1185], card.title);
    for (const path of Object.values(card.maps ?? {})) assert.ok(existsSync(`public${path.split('?')[0]}`), `${card.title}: ${path}`);
    assert.ok(card.source?.notes.includes('individual optical tuning are assigned'), `${card.title}: missing tuning provenance`);
    assert.ok(card.source?.notes.includes('physical-reference matching remains pending'), `${card.title}: missing validation status`);
  }
});

test('rarity coverage maps to distinct physical treatment families', () => {
  const profiles = Map.groupBy(yugiohTopCards, card => card.profile);
  assert.ok((profiles.get('ygo-quarter-century')?.length ?? 0) >= 10);
  assert.ok((profiles.get('ygo-starlight')?.length ?? 0) >= 20);
  for (const profile of ['ygo-ultimate', 'ygo-collector', 'ygo-prismatic-secret', 'ygo-ultra', 'ygo-super']) {
    assert.ok(profiles.has(profile), `${profile} is not represented`);
  }
});

test('Link Monsters use the corner-cleared artwork mask', () => {
  const linkTitles = ['S:P Little Knight', 'Charmer Quartet in Bloom', 'Dharc the Dark Charmer, Gloomy', "Zenna's Deceiving Doll Maidens", 'Cross-Sheep'];
  for (const card of yugiohTopCards) {
    const expected = linkTitles.includes(card.title)
      ? '/cards/shared/yugioh-standard/artwork-link.svg?v=1'
      : '/cards/shared/yugioh-standard/artwork.svg?v=4';
    assert.equal(card.maps?.foil, expected, card.title);
  }
});

test('all 50 cards enter the random holo pool', () => {
  assert.equal(new Set(yugiohTopCardIds).size, 50);
  for (const id of yugiohTopCardIds) assert.ok(holographicCardIds.includes(id), `${id} is missing from the pack pool`);
});
