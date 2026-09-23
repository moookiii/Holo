import test from 'node:test';
import assert from 'node:assert/strict';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import type { PokemonSet } from '../src/pokemon/types.ts';

const set: PokemonSet = { id: 'fixture', name: 'Fixture', era: 'sv', releaseDate: '2023-03-31', series: { id: 'sv', name: 'Scarlet & Violet' }, cardIds: ['fixture-1'], boosters: [{ id: 'A', name: 'A' }] };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
test('SDK adapter caches normalized data and preserves image, rarity, variant and booster membership', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return reply({ id: 'fixture-1', localId: '1', name: 'Test', set: { id: 'fixture', name: 'Fixture' }, rarity: 'Hyper rare',
      variants: { holo: true, reverse: false, normal: false }, image: 'https://assets.tcgdex.net/en/sv/fixture/1', boosters: [{ id: 'A', name: 'A' }] });
  });
  const catalog = new TcgdexAdapter(), signal = new AbortController().signal;
  const card = await catalog.card('fixture-1', set, signal);
  assert.equal(card.rarity, 'Hyper Rare'); assert.deepEqual(card.variants, ['holo']); assert.deepEqual(card.boosterIds, ['A']);
  assert.ok(card.front?.endsWith('/high.png')); assert.ok(card.thumbnail?.endsWith('/low.webp'));
  assert.deepEqual(await catalog.card('fixture-1', set, signal), card); assert.equal(requests, 1);
  assert.equal('getImageURL' in card, false);
});
test('Base Set normalization distinguishes holo rares and in-set Basic Energy', async t => {
  const base: PokemonSet = { ...set, id: 'base1', era: 'base', series: { id: 'base', name: 'Base' } };
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    const id = url.split('/').at(-1);
    return reply({ id, localId: id?.split('-')[1], name: id, set: { id: 'base1', name: 'Base Set' },
      rarity: id === 'base1-99' ? 'Common' : 'Rare', category: id === 'base1-99' ? 'Energy' : 'Pokemon',
      energyType: id === 'base1-99' ? 'Normal' : undefined,
      variants: { normal: id !== 'base1-4', holo: id === 'base1-4', reverse: false } });
  });
  const catalog = new TcgdexAdapter(), signal = new AbortController().signal;
  assert.equal((await catalog.card('base1-4', base, signal)).rarity, 'Holo Rare');
  assert.equal((await catalog.card('base1-17', base, signal)).rarity, 'Rare');
  const energy = await catalog.card('base1-99', base, signal);
  assert.equal(energy.category, 'Energy'); assert.equal(energy.energyType, 'Normal');
  assert.equal(energy.rarity, 'Common');
});
test('concurrent SDK requests bind distinct AbortSignals and stale requests do not cache adapter data', async t => {
  const signals: AbortSignal[] = []; const finish: (() => void)[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    signals.push(init.signal!);
    await new Promise<void>(resolve => finish.push(resolve));
    const id = url.split('/').at(-1);
    return reply({ id, name: id, sets: [] });
  });
  const catalog = new TcgdexAdapter(), a = new AbortController(), b = new AbortController();
  const first = catalog.sets('cancel-a', a.signal), second = catalog.sets('cancel-b', b.signal);
  const rejected = assert.rejects(first, { name: 'AbortError' });
  assert.equal(signals.length, 2); a.abort();
  assert.equal(signals[0].aborted, true); assert.equal(signals[1].aborted, false);
  finish.forEach(resolve => resolve()); await rejected; assert.deepEqual(await second, []);
});
test('transient failures retry, permanent failures remain retryable from UI, absent data never returns a biased card pool', async t => {
  let attempts = 0;
  t.mock.method(globalThis, 'fetch', async () => ++attempts === 1 ? reply({}, 503) : reply({ id: 'retry-fixture', name: 'Retry', sets: [] }));
  const catalog = new TcgdexAdapter(), signal = new AbortController().signal;
  assert.deepEqual(await catalog.sets('retry-fixture', signal), []); assert.equal(attempts, 2);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => reply({}, 404));
  await assert.rejects(catalog.cards({ ...set, cardIds: ['missing-fixture'] }, signal), /404/);
});
