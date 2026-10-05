import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const options = { headless: true };
if (!existsSync(chromium.executablePath())) {
  for (const version of (await readdir(join(process.env.LOCALAPPDATA, 'ms-playwright'))).filter(name => /^chromium-\d+$/.test(name)).sort().reverse()) {
    const path = join(process.env.LOCALAPPDATA, 'ms-playwright', version, 'chrome-win64', 'chrome.exe');
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const browser = await chromium.launch(options), page = await browser.newPage();
const url = process.env.GALLERY_URL || 'http://127.0.0.1:5173';
const out = 'artifacts/card-cache'; await mkdir(out, { recursive: true });
try {
  await page.route('**/cache-harness', route => route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
  await page.goto(`${url}/cache-harness`);
  const first = await page.evaluate(async () => {
    const { PersistentCardCache } = await import('/src/assets/PersistentCardCache.ts');
    const cache = new PersistentCardCache('test-holo-persistence', 24);
    await cache.set('a', new Uint8Array([1, 2, 3]), 12);
    await new Promise(resolve => setTimeout(resolve, 5));
    await cache.set('b', new Float32Array([.25, .5, 1]), 12);
    await new Promise(resolve => setTimeout(resolve, 5));
    await cache.get('a');
    await cache.set('c', new Uint8Array([7, 8, 9]), 12);
    return { a: [...await cache.get('a')], evicted: await cache.get('b') === undefined, stats: cache.stats() };
  });
  assert.deepEqual(first.a, [1, 2, 3]); assert.ok(first.evicted); assert.equal(first.stats.bytes, 24);
  await page.reload();
  const second = await page.evaluate(async () => {
    const { PersistentCardCache } = await import('/src/assets/PersistentCardCache.ts');
    const cache = new PersistentCardCache('test-holo-persistence', 24);
    const a = await cache.get('a'), c = await cache.get('c');
    await cache.set('too-big', new Uint8Array(25), 25);
    const missingRevision = await cache.get('new-revision:a');
    Object.defineProperty(window, 'indexedDB', { configurable: true, get() { throw new Error('Storage denied'); } });
    const denied = new PersistentCardCache('denied');
    const miss = await denied.get('a'); await denied.set('a', 1, 1);
    return { a: [...a], c: [...c], typed: a instanceof Uint8Array,
      oversized: await cache.get('too-big') === undefined, invalidated: missingRevision === undefined, denied: miss === undefined, errors: denied.stats().errors };
  });
  assert.deepEqual(second.a, [1, 2, 3]); assert.deepEqual(second.c, [7, 8, 9]);
  assert.ok(second.typed && second.oversized && second.invalidated && second.denied && second.errors > 0);
  const report = { first, second }; await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
} finally { await browser.close(); }
