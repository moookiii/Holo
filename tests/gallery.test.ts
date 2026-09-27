import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GalleryResidency } from '../src/gallery/GalleryResidency.ts';
import { galleryLayout } from '../src/gallery/GalleryLayout.ts';
import { influence, damp } from '../src/gallery/GalleryMotion.ts';
import { filterCards } from '../src/gallery/GalleryQuery.ts';
import type { CardDefinition } from '../src/card/CardDefinition.ts';

test('10,000 cards remain inside the slot budget over repeated traversal and resizes', () => {
  const residency = new GalleryResidency(48);
  for (const [width, height] of [[320, 720], [1440, 1100], [3840, 2160], [800, 5000]]) {
    for (let pass = 0; pass < 3; pass++) for (let scroll = 0; scroll < 600000; scroll += 3517) {
      const layout = galleryLayout(width, height, 10000, scroll);
      assert.ok(layout.end - layout.start <= 48);
      const ids = Array.from({ length: layout.end - layout.start }, (_, i) => String(layout.start + i));
      const assigned = residency.reconcile(ids);
      assert.equal(new Set(assigned.map(a => a.slot)).size, ids.length);
      assert.equal(residency.slots.filter(s => s.visible).length, ids.length);
    }
  }
});
test('stale uploads cannot replace an evicted card; recently needed slots survive', () => {
  const residency = new GalleryResidency(2);
  const [a] = residency.reconcile(['a', 'b']);
  residency.reconcile(['b']);
  residency.reconcile(['c']);
  assert.equal(residency.owns(a.slot, a.token), false);
  assert.ok(residency.slots.some(s => s.id === 'b'));
  residency.clear(); assert.equal(residency.owns(a.slot, a.token), false);
});
test('a cursor influences neighboring cards, smoothly returns and respects distance', () => {
  assert.ok(influence(-180, 40).yaw < 0);
  assert.ok(influence(180, 40).yaw > 0);
  assert.equal(influence(600, 0).yaw, 0);
  assert.ok(Math.abs(influence(519.99, 0).yaw) < .00001);
  let value = .2;
  for (let i = 0; i < 90; i++) value = damp(value, 0, 1 / 60);
  assert.ok(value < .000001);
});
test('facets intersect with search without inventing missing rarity/category', () => {
  const cards = [
    { id: 'a', title: 'Lugia', set: 'Neo', number: '9', franchise: 'Pokémon', profile: 'holo', pokemon: { rarity: 'Rare', category: 'Pokemon', variant: 'holo' } },
    { id: 'b', title: 'Lugia', set: 'Neo', number: '10', franchise: 'Pokémon', profile: 'print-only' },
    { id: 'c', title: 'Dragon', set: 'Other', number: '1', franchise: 'Yu-Gi-Oh!', profile: 'holo' },
  ] as CardDefinition[];
  assert.deepEqual(filterCards(cards, { search: 'lugia neo', rarity: 'Rare', finish: 'holo' }).map(c => c.id), ['a']);
  assert.equal(filterCards(cards, { search: '', category: 'Pokemon' }).length, 1);
  assert.equal(filterCards(cards, { search: '', game: 'Yu-Gi-Oh!', set: 'Neo' }).length, 0);
  assert.equal(filterCards(cards, { search: '' }).length, 3);
});
