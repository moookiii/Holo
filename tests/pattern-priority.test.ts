import test from 'node:test';
import assert from 'node:assert/strict';
import { PatternCache } from '../src/materials/patterns/PatternCache.ts';

test('foreground manufacturing bypasses queued warmups and paused requests resume without duplication', async () => {
  const previous = globalThis.Worker;
  let worker;
  class WorkerFixture {
    sent = []; onmessage; onerror;
    constructor() { worker = this; }
    postMessage(message) { this.sent.push(message); }
    terminate() {}
    finish() {
      const message = this.sent.at(-1);
      this.onmessage({ data: { id: message.id, field: { width: 1, height: 1, direction: new Uint8Array(4), relief: new Uint8Array(4) } } });
    }
  }
  globalThis.Worker = WorkerFixture;
  const cache = new PatternCache();
  try {
    const spec = { kind: 'satin', seed: 1, aspect: .7, scale: 840 };
    const first = cache.get(spec);
    const background = cache.get({ ...spec, seed: 2 }, undefined, -1);
    const foreground = cache.get({ ...spec, seed: 3 });
    cache.setBackgroundPaused(true);
    worker.finish(); await first;
    assert.equal(worker.sent.at(-1).spec.seed, 3);
    worker.finish(); await foreground;
    assert.equal(worker.sent.length, 2, 'paused warmups must not upload during a pack');
    const promoted = cache.get({ ...spec, seed: 2 });
    assert.equal(promoted, background, 'promotion retains the cached promise');
    assert.equal(worker.sent.at(-1).spec.seed, 2);
    worker.finish(); await promoted;
    const later = cache.get({ ...spec, seed: 4 }, undefined, -1);
    assert.equal(worker.sent.length, 3);
    cache.setBackgroundPaused(false); assert.equal(worker.sent.at(-1).spec.seed, 4);
    worker.finish(); await later;
  } finally { cache.dispose(); globalThis.Worker = previous; }
});

test('authoring cache evicts old variants without disposing fields bound to the card', async () => {
  const previous = globalThis.Worker;
  let worker;
  class WorkerFixture {
    onmessage; onerror;
    constructor() { worker = this; }
    postMessage(message) { queueMicrotask(() => this.onmessage({ data: { id: message.id, field: { width: 1, height: 1, direction: new Uint8Array(4), relief: new Uint8Array(4) } } })); }
    terminate() {}
  }
  globalThis.Worker = WorkerFixture;
  const cache = new PatternCache();
  try {
    const bound = await cache.get({ kind: 'satin', seed: 1, aspect: .7, scale: 10 });
    let boundDisposed = false; bound.direction.addEventListener('dispose', () => boundDisposed = true);
    for (let scale = 11; scale < 30; scale++) { await cache.get({ kind: 'satin', seed: 1, aspect: .7, scale }); cache.trim(3, [bound]); }
    assert.equal(boundDisposed, false); assert.equal(cache.stats().fields, 3); assert.equal(cache.stats().textures, 6);
    cache.trim(0); assert.equal(boundDisposed, true); assert.equal(cache.stats().textures, 0);
  } finally { cache.dispose(); globalThis.Worker = previous; }
});
