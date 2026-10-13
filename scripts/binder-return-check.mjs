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
  await page.goto(process.env.BINDER_URL || 'http://127.0.0.1:5173/?backend=webgpu&benchmark-cold-viewer=1');
  await page.waitForFunction(() => window.__holo?.gallery.stats()?.active, null, { timeout: 120000 });
  await page.evaluate(() => {
    const gallery = window.__holo.gallery.instance();
    gallery.favorites.ids = new Set(gallery.catalog.cards().slice(0, 80).map(card => card.id));
    gallery.options.lighting.playing = false;
    gallery.openBinder();
  });
  async function waitForBinder() {
    await page.waitForFunction(() => {
      const s = window.__holo.gallery.stats();
      return s.binder && s.visibleExpected > 0 && s.visible === s.visibleExpected && s.neighborsReady && !s.pending;
    }, null, { timeout: 240000 });
  }
  await waitForBinder();
  // A noninitial spread proves navigation survives the viewer round trip too.
  await page.evaluate(() => window.__holo.gallery.instance().binder.turn(1));
  await page.waitForFunction(() => window.__holo.gallery.stats().spread === 1 && !window.__holo.gallery.stats().turning);
  await waitForBinder();
  const before = await page.evaluate(() => {
    const binder = window.__holo.gallery.instance().binder;
    window.retainedBinder = { factory: binder.factory, graphics: binder.graphics,
      pages: [...binder.physical.pages.values()], work: { compile: 0, upload: 0, preparePreview: 0 } };
    for (const [target, method] of [[binder.factory, 'compile'], [binder.graphics, 'upload'], [binder.options.cpu, 'preparePreview']]) {
      const original = target[method];
      target[method] = function (...args) {
        window.retainedBinder.work[method]++;
        return original.apply(this, args);
      };
    }
    const snapshot = () => ({ spread: binder.navigation.spread, binderIndex: binder.navigation.binder,
      uploads: binder.graphics.uploads, loaded: [...binder.loaded],
      cards: [...binder.physical.pages.values()].flatMap(page => [...page.cards.values()].map(card => card.mesh.uuid)) });
    window.binderSnapshot = snapshot;
    return snapshot();
  });
  console.log('Binder ready', JSON.stringify({ spread: before.spread, residentCards: before.cards.length }));
  const returns = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    // The stage owns pointer input; pocket buttons deliberately pass it through.
    const bounds = await page.locator('.binder-card:visible').first().boundingBox();
    assert.ok(bounds);
    await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.waitForFunction(() => !window.__holo.gallery.stats().active, null, { timeout: 240000 });
    const suspended = await page.evaluate(() => {
      const binder = window.__holo.gallery.instance().binder, saved = window.retainedBinder;
      return { factory: binder.factory === saved.factory, graphics: binder.graphics === saved.graphics,
        hidden: !binder.active && !binder.physical.group.visible && !binder.graphics?.mesh.visible,
        snapshot: window.binderSnapshot() };
    });
    assert.equal(suspended.factory, true);
    assert.equal(suspended.graphics, true);
    assert.equal(suspended.hidden, true);
    assert.deepEqual(suspended.snapshot, before);
    const start = Date.now();
    await page.locator('#gallery-open').click();
    await waitForBinder();
    const after = await page.evaluate(() => {
      const binder = window.__holo.gallery.instance().binder, saved = window.retainedBinder;
      return { snapshot: window.binderSnapshot(), work: saved.work,
        samePages: [...binder.physical.pages.values()].every((page, i) => page === saved.pages[i]) };
    });
    assert.deepEqual(after.snapshot, before, 'return must reuse every resident card and atlas layer');
    assert.equal(after.samePages, true);
    assert.deepEqual(after.work, { compile: 0, upload: 0, preparePreview: 0 });
    returns.push({ ms: Date.now() - start, ...after });
    console.log('Return reused binder', attempt + 1);
  }
  await mkdir('artifacts/favorites-binder', { recursive: true });
  await page.screenshot({ path: 'artifacts/favorites-binder/return-from-viewer.png' });
  await page.locator('.favorites-binder .binder-header button').filter({ hasText: '← Gallery' }).click();
  await page.waitForFunction(() => !window.__holo.gallery.instance().binder.active);
  const released = await page.evaluate(() => {
    const binder = window.__holo.gallery.instance().binder;
    return !binder.factory && !binder.graphics && !binder.loaded.size && !binder.shellReady;
  });
  assert.equal(released, true, 'leaving Favorites must still release its GPU resources');
  assert.deepEqual(errors, []);
  const report = { before, returns, released, errors };
  await writeFile('artifacts/favorites-binder/return-report.json', JSON.stringify(report, null, 2));
  console.log('PASS viewer returns reuse pages and previews without preparation, uploads or compilation');
} finally {
  await browser.close();
}
