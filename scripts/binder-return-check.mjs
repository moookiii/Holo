import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.routeWebSocket('**', socket => socket.close());
  await page.goto(process.env.BINDER_URL || 'http://127.0.0.1:5173/?backend=webgpu');
  await page.waitForFunction(() => window.__holo?.gallery.stats()?.active);
  await page.evaluate(() => {
    const gallery = window.__holo.gallery.instance();
    gallery.favorites.ids = new Set(gallery.catalog.cards().slice(0, 12).map(card => card.id));
    gallery.openBinder();
  });
  await page.waitForFunction(() => {
    const s = window.__holo.gallery.stats();
    return s.binder && s.visible === 12 && !s.pending;
  }, null, { timeout: 240000 });
  const before = await page.evaluate(() => {
    const binder = window.__holo.gallery.instance().binder;
    window.returnWork = { realizeCardGpu: 0, create: 0, uploadCardResources: 0, compile: 0 };
    for (const key of Object.keys(window.returnWork)) {
      const original = binder.factory[key];
      binder.factory[key] = function (...args) {
        window.returnWork[key]++;
        return original.apply(this, args);
      };
    }
    return [...binder.physical.pages.get(0).cards.values()].map(card => card.mesh.uuid);
  });
  const turns = [];
  async function turn(direction, spread) {
    const start = Date.now();
    await page.evaluate(direction => window.__holo.gallery.instance().binder.turn(direction), direction);
    await page.waitForFunction(spread => {
      const s = window.__holo.gallery.stats();
      return s.spread === spread && !s.turning && !s.pending;
    }, spread, { timeout: 60000 });
    const stats = await page.evaluate(() => window.__holo.gallery.stats());
    assert.ok(stats.residentCards <= 72);
    assert.ok(stats.residentPages <= 6);
    turns.push({ spread, ms: Date.now() - start, visible: stats.visible, cached: stats.cachedCards });
  }
  for (let spread = 1; spread <= 5; spread++) await turn(1, spread);
  assert.equal(await page.evaluate(() => window.__holo.gallery.stats().cachedCards), 12);
  for (let spread = 4; spread >= 0; spread--) await turn(-1, spread);
  const after = await page.evaluate(() => {
    const binder = window.__holo.gallery.instance().binder;
    return [...binder.physical.pages.get(0).cards.values()].map(card => card.mesh.uuid);
  });
  assert.deepEqual(after, before, 'return must reuse the original GPU card instances');
  const work = await page.evaluate(() => window.returnWork);
  assert.deepEqual(work, { realizeCardGpu: 0, create: 0, uploadCardResources: 0, compile: 0 });
  assert.deepEqual(errors, []);
  await mkdir('artifacts/favorites-binder', { recursive: true });
  const report = { turns, work, errors };
  await writeFile('artifacts/favorites-binder/return-report.json', JSON.stringify(report, null, 2));
  await page.screenshot({ path: 'artifacts/favorites-binder/return-first-page.png' });
  await page.evaluate(async () => {
    const binder = window.__holo.gallery.instance().binder;
    await binder.selectBinder(0);
    binder.hide();
  });
  assert.equal(await page.evaluate(() => window.__holo.gallery.instance().binder.cachedCards.size), 0);
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
