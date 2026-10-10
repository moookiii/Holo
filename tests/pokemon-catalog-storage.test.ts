import test from 'node:test';
import assert from 'node:assert/strict';

test('pack catalogs survive full browser storage and Sword & Shield uses only local sets', async t => {
  let reads = 0, writes = 0, requests = 0;
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  t.after(() => {
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem() { reads++; throw new DOMException('Storage denied', 'SecurityError'); },
    setItem() { writes++; throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); },
  } } });
  t.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return new Response(JSON.stringify({ id: 'storage-fixture', name: 'Fixture', sets: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  const { TcgdexAdapter } = await import('../src/pokemon/TcgdexAdapter.ts');
  const { svTcglSets } = await import('../src/pokemon/SvTcglCatalog.ts');
  const catalog = new TcgdexAdapter(), signal = new AbortController().signal;
  const sets = await catalog.sets('swsh', signal);
  assert.ok(sets.some(set => set.id === 'swsh1'));
  const expected = svTcglSets.filter(set => set.series.id === 'swsh')
    .sort((a, b) => a.releaseDate!.localeCompare(b.releaseDate!) || a.id.localeCompare(b.id));
  assert.deepEqual(sets.map(set => set.id), expected.map(set => set.id));
  assert.equal(requests, 0);
  assert.equal(reads, 0);
  assert.equal(writes, 0);
  assert.deepEqual(await catalog.sets('storage-fixture', signal), []);
  assert.equal(reads, 1);
  assert.equal(writes, 1);
  assert.deepEqual(await catalog.sets('storage-fixture', signal), []);
  assert.equal(requests, 1);
});
