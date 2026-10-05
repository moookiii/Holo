import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const out = 'artifacts/favorites-binder';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const errors = [], report = { mode: process.env.BINDER_WARM ? 'prepared' : 'cold', errors };
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.routeWebSocket('**', socket => socket.close());
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(process.env.BINDER_URL || 'http://127.0.0.1:5173/?backend=webgpu&benchmark-cold-viewer=1');
  await page.waitForFunction(() => {
    const s = window.__holo?.gallery.stats();
    return s?.active && s.visibleExpected > 0 && s.visible === s.visibleExpected;
  }, null, { timeout: 120000 });
  await page.evaluate(() => {
    const g = window.__holo.gallery.instance();
    g.favorites.ids = new Set(g.catalog.cards().slice(0, 73).map(c => c.id));
  });
  if (process.env.BINDER_WARM) await page.waitForFunction(() => {
    const b = window.__holo.gallery.instance().binder;
    return b && !b.active && !b.job && b.stats().visible === 24;
  }, null, { timeout: 120000 });
  report.open = await page.evaluate(async () => {
    const g = window.__holo.gallery.instance(), start = performance.now();
    g.openBinder();
    const constructMs = performance.now() - start;
    // Cross a rendered frame, not merely the synchronous ready counter.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    while (g.stats().visible !== g.stats().visibleExpected) {
      if (performance.now() - start > 120000) throw new Error('Visible spread timed out');
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return { constructMs, visibleMs: performance.now() - start, stats: g.stats() };
  });
  assert.equal(report.open.stats.visible, 24);
  assert.equal(report.open.stats.visibleFailed, 0);
  await page.screenshot({ path: `${out}/loading-${report.mode}.png` });
  // Interrupt an in-flight warmup and change the collection before opening.
  await page.evaluate(async () => {
    const g = window.__holo.gallery.instance(), b = g.binder;
    await b.suspendPreparation(); b.hide();
    b.warm(g.catalog.cards().slice(0, 73));
    await new Promise(resolve => setTimeout(resolve, 50));
    b.show(g.catalog.cards().slice(40, 64));
  });
  await page.waitForFunction(() => {
    const b = window.__holo.gallery.instance().binder, s = b.stats();
    return !s.preparing && s.visible === s.visibleExpected && !s.pending;
  }, null, { timeout: 120000 });
  report.interrupted = await page.evaluate(() => {
    const b = window.__holo.gallery.instance().binder;
    return { stats: b.stats(), correctSlots: [...b.physical.pages].every(([face, page]) =>
      [...page.cards].every(([slot, card]) => card.definition.id === b.cards[face * 12 + slot]?.id)) };
  });
  assert.equal(report.interrupted.correctSlots, true);
  assert.equal(report.interrupted.stats.visibleFailed, 0);
  assert.deepEqual(errors, []);
  if (process.env.BINDER_MAX_VISIBLE_MS) assert.ok(report.open.visibleMs <= Number(process.env.BINDER_MAX_VISIBLE_MS), `Visible spread: ${report.open.visibleMs} ms`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(`${out}/latency-${report.mode}.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
