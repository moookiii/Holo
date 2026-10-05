import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SharedPreparation } from '../src/card/SharedPreparation.ts';

test('one consumer cannot cancel another consumer of the same preparation', async () => {
  const jobs = new SharedPreparation<number>(), a = new AbortController(), b = new AbortController();
  let resolve!: (value: number) => void, workSignal!: AbortSignal, starts = 0;
  const work = (signal: AbortSignal) => { starts++; workSignal = signal; return new Promise<number>(done => { resolve = done; }); };
  const first = jobs.run('card', a.signal, work), second = jobs.run('card', b.signal, work);
  await Promise.resolve();
  const rejected = assert.rejects(first, { name: 'AbortError' }); a.abort(); await rejected;
  assert.equal(workSignal.aborted, false); resolve(42);
  assert.equal(await second, 42); assert.equal(starts, 1); assert.equal(jobs.hits, 1);
});

test('last cancellation frees work and an obsolete completion cannot delete its replacement', async () => {
  const jobs = new SharedPreparation<number>(), cancel = new AbortController();
  let oldResolve!: (value: number) => void, oldSignal!: AbortSignal, newResolve!: (value: number) => void;
  const first = jobs.run('card', cancel.signal, signal => { oldSignal = signal; return new Promise(done => { oldResolve = done; }); });
  await Promise.resolve(); const rejected = assert.rejects(first); cancel.abort(); await rejected;
  assert.ok(oldSignal.aborted);
  const next = jobs.run('card', new AbortController().signal, () => new Promise(done => { newResolve = done; }));
  oldResolve(1); await Promise.resolve(); await Promise.resolve();
  const shared = jobs.run('card', new AbortController().signal, () => { throw new Error('duplicate'); });
  newResolve(2); assert.deepEqual(await Promise.all([next, shared]), [2, 2]);
});
