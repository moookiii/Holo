import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardPreviewCache } from '../src/card/CardPreviewCache.ts';
import type { CardDefinition } from '../src/card/CardDefinition.ts';
import type { CardPreview } from '../src/card/CardPreviewPreparation.ts';

const card = (id: string) => ({ id, front: '/front.png', seed: 1 } as CardDefinition);
const preview = (bytes = 12): CardPreview => ({ images: [new Uint8Array(bytes - 4)], parameters: new Float32Array(1) });

test('revisiting a card keeps its exact pixels and evicts the least recently used preview', () => {
  const cache = new CardPreviewCache(24), a = preview(), b = preview(), c = preview();
  cache.set(card('a'), a); cache.set(card('b'), b);
  assert.equal(cache.get(card('a')), a);
  cache.set(card('c'), c);
  assert.equal(cache.get(card('b')), undefined);
  assert.equal(cache.get(card('a')), a);
  assert.equal(cache.get(card('c')), c);
  assert.equal(cache.stats().previewBytes, 24);
});

test('preview identity includes seed, geometry, layout, coverage and fallback changes', () => {
  const cache = new CardPreviewCache(), source = card('a');
  cache.set(source, preview());
  for (const change of [{ seed: 2 }, { dimensions: { width: 5.9 } }, { layout: { artwork: [0, 0, 1, 1] } },
    { coverageMode: 'reverse' }, { frontFallback: '/fallback.png' }, { proceduralFoil: 'full' },
    { maps: { normal: '/new-normal.png' } }, { profileOverrides: { normalScale: 2 } }]) {
    assert.equal(cache.get({ ...source, ...change } as CardDefinition), undefined);
  }
});

test('byte accounting handles replacement, oversized previews and disposal', () => {
  const cache = new CardPreviewCache(24);
  cache.set(card('a'), preview()); cache.set(card('a'), preview(20));
  assert.equal(cache.stats().previewBytes, 20);
  cache.set(card('b'), preview(28));
  assert.equal(cache.get(card('b')), undefined);
  assert.equal(cache.stats().previewBytes, 20);
  cache.clear();
  assert.equal(cache.stats().previewBytes, 0);
  assert.equal(cache.get(card('a')), undefined);
});
