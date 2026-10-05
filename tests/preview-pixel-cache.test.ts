import test from 'node:test';
import assert from 'node:assert/strict';
import { PreviewPixelCache } from '../src/card/PreviewPixelCache.ts';

test('shared pixels survive front mutation, transfer, and LRU pressure', async () => {
  const cache = new PreviewPixelCache(8), signal = new AbortController().signal;
  let loads = 0;
  const load = async () => { loads++; return new Uint8Array([1, 2, 3, 4]); };
  const [first, second] = await Promise.all([cache.read('a', signal, load), cache.read('a', signal, load)]);
  assert.equal(loads, 1); first[3] = 0;
  structuredClone(first, { transfer: [first.buffer] });
  assert.deepEqual(second, new Uint8Array([1, 2, 3, 4]));
  await cache.read('b', signal, load); await cache.read('a', signal, load); await cache.read('c', signal, load);
  assert.equal(cache.stats().bytes, 8);
  assert.deepEqual(await cache.read('a', signal, load), second);
  await cache.read('b', signal, load); assert.equal(loads, 4);
});

test('cancellation belongs to consumers; failures can retry', async () => {
  const cache = new PreviewPixelCache(), one = new AbortController(), two = new AbortController();
  let complete!: (pixels: Uint8Array) => void;
  const load = (signal: AbortSignal) => new Promise<Uint8Array>(resolve => {
    complete = pixels => { assert.equal(signal.aborted, false); resolve(pixels); };
  });
  const first = cache.read('a', one.signal, load), second = cache.read('a', two.signal, load);
  await Promise.resolve(); one.abort(); await assert.rejects(first);
  complete(new Uint8Array([7])); assert.deepEqual(await second, new Uint8Array([7]));
  await assert.rejects(cache.read('b', two.signal, async () => { throw new Error('decode'); }));
  assert.deepEqual(await cache.read('b', two.signal, async () => new Uint8Array([8])), new Uint8Array([8]));
});
