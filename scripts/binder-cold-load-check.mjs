import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const out = join(process.cwd(), 'artifacts/favorites-binder');
await mkdir(out, { recursive: true });
let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) {
  for (const dir of (await readdir(join(process.env.LOCALAPPDATA, 'ms-playwright'))).filter(name => /^chromium-/.test(name)).sort().reverse()) {
    const candidate = join(process.env.LOCALAPPDATA, 'ms-playwright', dir, 'chrome-win64/chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const errors = [], report = { errors };
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', error => errors.push(String(error)));
  await page.routeWebSocket('**', socket => socket.close());
  const url = new URL(process.env.BINDER_URL || 'http://127.0.0.1:5173/?backend=webgpu');
  url.searchParams.set('benchmark-cold-viewer', '1');
  await page.goto(url.href);
  await page.waitForFunction(() => {
    const stats = window.__holo?.gallery.stats();
    return stats?.active && stats.visibleExpected > 0 && stats.visible === stats.visibleExpected && !stats.visibleFailed;
  }, null, { timeout: 120000 });
  await page.evaluate(() => {
    const gallery = window.__holo.gallery.instance();
    gallery.favorites.ids = new Set(gallery.catalog.cards().slice(0, 73).map(card => card.id));
    const timing = window.binderColdTiming = { start: performance.now() };
    gallery.openBinder();
    timing.constructMs = performance.now() - timing.start;
    const poll = () => {
      const stats = gallery.stats(), elapsed = performance.now() - timing.start;
      if (stats.visible && !timing.firstMs) timing.firstMs = elapsed;
      if (stats.visible === stats.visibleExpected && !timing.visibleMs) timing.visibleMs = elapsed;
      if (!stats.pending) timing.totalMs = elapsed;
      else requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });
  await page.waitForFunction(() => window.binderColdTiming.totalMs, null, { timeout: 240000 });
  report.cold = await page.evaluate(() => ({ timing: window.binderColdTiming, stats: window.__holo.gallery.stats() }));
  assert.equal(report.cold.stats.visible, 24);
  assert.equal(report.cold.stats.visibleFailed, 0);
  assert.ok(report.cold.stats.neighborsReady);
  report.viewerCache = await page.evaluate(async () => {
    const binder = window.__holo.gallery.instance().binder;
    const card = binder.cards[12], cpu = binder.options.cpu;
    const prepared = await cpu.cached(card);
    const modified = await cpu.cached({ ...card, front: `${card.front}?different` });
    return { hit: !!prepared, mismatchedDefinitionRejected: !modified };
  });
  assert.deepEqual(report.viewerCache, { hit: true, mismatchedDefinitionRejected: true });
  await page.screenshot({ path: join(out, 'cold-load.png') });
  report.viewerOpen = await page.evaluate(async () => {
    const h = window.__holo, binder = h.gallery.instance().binder, id = binder.cards[12].id;
    const prototype = binder.factory.constructor.prototype;
    const create = prototype.create, realize = prototype.realizeCardGpu;
    let creates = 0, realizations = 0;
    prototype.create = function (...args) { creates++; return create.apply(this, args); };
    prototype.realizeCardGpu = function (...args) { realizations++; return realize.apply(this, args); };
    const start = performance.now();
    try {
      await binder.inspect(id);
      return { ms: performance.now() - start, creates, realizations, expected: id, actual: h.stats().card };
    } finally { prototype.create = create; prototype.realizeCardGpu = realize; }
  });
  assert.equal(report.viewerOpen.creates, 0, 'prepared binder cards must not rebuild CPU resources in the viewer');
  assert.equal(report.viewerOpen.realizations, 1);
  assert.equal(report.viewerOpen.actual, report.viewerOpen.expected);
  await page.evaluate(() => window.__holo.gallery.open());
  // Abort while work is queued, then exercise the stale shared-promise retry.
  await page.evaluate(async () => {
    const gallery = window.__holo.gallery.instance(), binder = gallery.binder;
    const cards = gallery.catalog.cards().slice(60, 133);
    await binder.replaceCollection(cards);
    await new Promise(resolve => setTimeout(resolve, 50));
    await binder.suspendPreparation();
    binder.hide();
    binder.show(cards);
  });
  await page.waitForFunction(() => {
    const stats = window.__holo.gallery.stats();
    return stats.binder && !stats.pending && stats.visible === stats.visibleExpected;
  }, null, { timeout: 240000 });
  report.reopened = await page.evaluate(() => window.__holo.gallery.stats());
  assert.equal(report.reopened.visibleFailed, 0);
  assert.ok(report.reopened.residentCards <= 72);
  report.cacheSnapshot = await page.evaluate(async () => {
    const { PersistentCardCache } = await import('/src/assets/PersistentCardCache.ts');
    const cache = new PersistentCardCache('holo-snapshot-check', 16);
    const source = new Uint8Array([1, 27, 128, 255]);
    let snapshot;
    const ready = new Promise(resolve => { snapshot = resolve; });
    const writing = cache.set('transfer', source, source.byteLength, snapshot);
    await ready;
    structuredClone(source, { transfer: [source.buffer] });
    await writing;
    const restored = await cache.get('transfer');
    const rejected = new PersistentCardCache('holo-snapshot-budget-check', 0);
    let notified = false;
    await rejected.set('too-large', new Uint8Array(4), 4, () => { notified = true; });
    return { detached: source.byteLength === 0, restored: Array.from(restored), rejectedWriteNotified: notified };
  });
  assert.deepEqual(report.cacheSnapshot, { detached: true, restored: [1, 27, 128, 255], rejectedWriteNotified: true });
  assert.deepEqual(errors, []);
  if (process.env.BINDER_MAX_VISIBLE_MS) {
    assert.ok(report.cold.timing.visibleMs <= Number(process.env.BINDER_MAX_VISIBLE_MS),
      `Cold visible spread took ${report.cold.timing.visibleMs.toFixed(1)} ms; budget ${process.env.BINDER_MAX_VISIBLE_MS} ms`);
  }
  console.log(JSON.stringify(report));
} finally {
  await writeFile(join(out, 'cold-load-report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
