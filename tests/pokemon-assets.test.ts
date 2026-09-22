import test from 'node:test';
import assert from 'node:assert/strict';
import { usableCardFront, fallbackWrapper } from '../src/pokemon/assets.ts';

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
test('missing artwork fallback remains set-specific and escapes remote names', () => {
  const a = fallbackWrapper({ name: 'Scarlet & Violet' });
  assert.notEqual(a, fallbackWrapper({ name: 'Paldea Evolved' }));
  assert.ok(decodeURIComponent(a).includes('Scarlet &amp; Violet'));
  assert.ok(!decodeURIComponent(fallbackWrapper({ name: '<script>' })).includes('<script>'));
});
