import test from 'node:test';
import assert from 'node:assert/strict';
import { Texture } from 'three/webgpu';
import { CardTextureCache } from '../src/card/CardTextureCache.ts';

test('live texture leases survive other cards and idle-budget eviction', () => {
  const cache = new CardTextureCache(8);
  let disposed = 0;
  const create = () => { const t = new Texture(); t.addEventListener('dispose', () => disposed++); return t; };
  const a = cache.acquire('back', 16, create), b = cache.acquire('back', 16, create);
  assert.equal(a.texture, b.texture);
  a.release(); a.release();
  assert.equal(disposed, 0);
  const c = cache.acquire('other', 16, create); c.release();
  assert.equal(disposed, 1);
  b.release(); assert.equal(disposed, 2);
  assert.equal(cache.stats().textureCacheEntries, 0);
});

test('bounded idle reuse and imported last-owner cleanup', () => {
  const cache = new CardTextureCache(16);
  let disposed = 0;
  const create = () => { const t = new Texture(); t.addEventListener('dispose', () => disposed++); return t; };
  const first = cache.acquire('field', 8, create); first.release();
  const reused = cache.acquire('field', 8, create);
  assert.equal(first.texture, reused.texture);
  const imported = cache.acquire('blob', 8, create, false), second = cache.acquire('blob', 8, create, false);
  imported.release(); assert.equal(disposed, 0);
  second.release(); assert.equal(disposed, 1);
  reused.release(); cache.dispose(); assert.equal(disposed, 2);
});
