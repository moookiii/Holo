import test from 'node:test';
import assert from 'node:assert/strict';
import { WarmResourcePool } from '../src/card/WarmResourcePool.ts';

test('hover and click share preparation; live resources survive byte-budget eviction', async () => {
  const destroyed: number[] = [];
  const pool = new WarmResourcePool<{ id: number; bytes: number }>(10, 3, v => v.bytes, v => destroyed.push(v.id));
  let creates = 0;
  const create = async () => { creates++; return { id: 1, bytes: 8 }; };
  const hover = pool.acquire('one', create), click = pool.acquire('one', create);
  assert.equal(await hover.pending, await click.pending); assert.equal(creates, 1);
  hover.release();
  const other = pool.acquire('two', async () => ({ id: 2, bytes: 8 })); await other.pending;
  other.release(); assert.deepEqual(destroyed, [2]);
  click.release();
  const repeat = pool.acquire('one', create); await repeat.pending;
  assert.equal(creates, 1); repeat.release(); pool.dispose(); assert.deepEqual(destroyed, [2, 1]);
});

test('failures retry, edited resources invalidate, teardown owns unfinished jobs', async () => {
  const destroyed: number[] = [];
  const pool = new WarmResourcePool<number>(100, 2, () => 1, v => destroyed.push(v));
  const failed = pool.acquire('card', async () => { throw Error('missing asset'); });
  await assert.rejects(failed.pending); failed.release();
  const good = pool.acquire('card', async () => 1); await good.pending;
  good.release(true); assert.deepEqual(destroyed, [1]);
  let complete!: (value: number) => void;
  const pending = pool.acquire('card', () => new Promise<number>(resolve => { complete = resolve; }));
  await Promise.resolve(); pool.dispose(); complete(2); await pending.pending;
  pending.release(); assert.deepEqual(destroyed, [1, 2]);
});

test('LRU count bound retains the most recently used entries', async () => {
  const destroyed: string[] = [];
  const pool = new WarmResourcePool<string>(100, 2, () => 1, v => destroyed.push(v));
  for (const key of ['a', 'b', 'a', 'c']) {
    const lease = pool.acquire(key, async () => key); await lease.pending; lease.release();
  }
  assert.deepEqual(destroyed, ['b']); assert.equal(pool.stats().entries, 2);
  pool.dispose();
});

test('edited live resources are not reused and release after teardown is harmless', async () => {
  const destroyed: number[] = [];
  const pool = new WarmResourcePool<number>(10, 3, () => 1, v => destroyed.push(v));
  const old = pool.acquire('card', async () => 1); await old.pending; old.invalidate();
  const next = pool.acquire('card', async () => 2); assert.equal(await next.pending, 2);
  old.release(); assert.deepEqual(destroyed, [1]);
  pool.dispose(); next.release(true); pool.dispose(); assert.deepEqual(destroyed, [1, 2]);
});

test('teardown also releases an edited live entry replaced under the same key', async () => {
  const destroyed: number[] = [];
  const pool = new WarmResourcePool<number>(10, 3, () => 1, v => destroyed.push(v));
  const old = pool.acquire('card', async () => 0); await old.pending; old.invalidate();
  const next = pool.acquire('card', async () => 2); await next.pending;
  pool.dispose(); old.release(); next.release();
  assert.deepEqual(destroyed.sort(), [0, 2]);
});
