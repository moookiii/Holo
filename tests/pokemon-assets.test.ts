import test from 'node:test';
import assert from 'node:assert/strict';
import { usableCardFront, fallbackWrapper } from '../src/pokemon/assets.ts';
import { localBoosterArt } from '../src/pokemon/boosterArt.ts';
import { basicEnergyCards } from '../src/pokemon/energy.ts';
import { pokemonRecipes } from '../src/pokemon/recipes.ts';
import { existsSync } from 'node:fs';

test('CORS-rejected PNG falls back to full-resolution WebP and caches only its URL', async t => {
  const urls: string[] = []; let closed = 0;
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url); if (url.endsWith('.png')) throw new TypeError('Failed to fetch');
    return new Response(new Blob(['image']));
  });
  const original = globalThis.createImageBitmap;
  globalThis.createImageBitmap = (async () => ({ close: () => { closed++; } })) as typeof createImageBitmap;
  try {
    const url = 'https://assets.tcgdex.net/en/sv/fixture/1/high.png', signal = new AbortController().signal;
    assert.equal(await usableCardFront(url, signal), url.replace('.png', '.webp'));
    assert.equal(await usableCardFront(url, signal), url.replace('.png', '.webp'));
    assert.equal(urls.length, 2); assert.equal(closed, 1);
    assert.ok(urls.every(url => !url.includes('/low.')));
    const cancelled = new AbortController(); cancelled.abort();
    await assert.rejects(usableCardFront(url, cancelled.signal), { name: 'AbortError' });
  } finally { globalThis.createImageBitmap = original; }
});
test('both rejected high-resolution formats fall back to the exact card thumbnail', async t => {
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url);
    if (url.includes('/high.')) throw new TypeError('CORS header rejected');
    return new Response(new Blob(['image']));
  });
  const original = globalThis.createImageBitmap;
  globalThis.createImageBitmap = (async () => ({ close: () => {} })) as typeof createImageBitmap;
  try {
    const high = 'https://assets.tcgdex.net/en/sv/sv08/108/high.png';
    const low = 'https://assets.tcgdex.net/en/sv/sv08/108/low.webp';
    const signal = new AbortController().signal;
    assert.equal(await usableCardFront(high, signal, low), low);
    assert.equal(await usableCardFront(high, signal, low), low);
    assert.deepEqual(urls, [high, high.replace('.png', '.webp'), low]);
  } finally { globalThis.createImageBitmap = original; }
});
test('missing artwork fallback remains set-specific and escapes remote names', () => {
  const a = fallbackWrapper({ name: 'Scarlet & Violet' });
  assert.notEqual(a, fallbackWrapper({ name: 'Paldea Evolved' }));
  assert.ok(decodeURIComponent(a).includes('Scarlet &amp; Violet'));
  assert.ok(!decodeURIComponent(fallbackWrapper({ name: '<script>' })).includes('<script>'));
});
test('every validated set has local booster art and every Basic Energy has a local front', () => {
  for (const recipe of pokemonRecipes) {
    const booster = localBoosterArt(recipe.setId)?.[0];
    assert.ok(booster?.front, `Missing booster art for ${recipe.setId}`);
    assert.ok(existsSync(`public${new URL(booster.front, 'https://local.test').pathname}`));
  }
  assert.equal(basicEnergyCards.length, 8);
  for (const card of basicEnergyCards) assert.ok(card.front && existsSync(`public${card.front}`), `Missing ${card.name}`);
});
