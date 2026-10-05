import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PreviewReadQueue } from '../src/card/PreviewReadQueue.ts';

test('canceling obsolete queued reads frees their place without executing them', async () => {
  const queue = new PreviewReadQueue(1), canceled = new AbortController();
  let release!: () => void, staleRan = false;
  const first = queue.run(new AbortController().signal, () => new Promise<void>(resolve => { release = resolve; }));
  await Promise.resolve();
  const stale = queue.run(canceled.signal, async () => { staleRan = true; });
  const last = queue.run(new AbortController().signal, async () => 'visible');
  canceled.abort(); await assert.rejects(stale); release();
  await first; assert.equal(await last, 'visible'); assert.equal(staleRan, false);
});

test('failed decodes release capacity and concurrent work stays bounded', async () => {
  const queue = new PreviewReadQueue(2), signal = new AbortController().signal;
  let running = 0, peak = 0;
  const jobs = Array.from({ length: 8 }, (_, index) => queue.run(signal, async () => {
    peak = Math.max(peak, ++running); await new Promise(resolve => setTimeout(resolve, 5)); running--;
    if (index === 0) throw new Error('decode failed'); return index;
  }));
  const results = await Promise.allSettled(jobs);
  assert.equal(peak, 2); assert.equal(results.filter(result => result.status === 'fulfilled').length, 7);
});
