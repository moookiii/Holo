import { chromium, firefox } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const url = process.env.GALLERY_URL || 'http://127.0.0.1:5173';
const out = join('artifacts', 'gallery-scroll-alignment');
await mkdir(out, { recursive: true });
const report = [];
for (const [name, engine] of [['chromium', chromium], ['firefox', firefox]]) {
  const options = { headless: true };
  if (!existsSync(engine.executablePath())) {
    const base = join(process.env.LOCALAPPDATA, 'ms-playwright');
    for (const folder of (await readdir(base)).filter(folder => folder.startsWith(`${name}-`)).sort().reverse()) {
      const path = join(base, folder, name === 'firefox' ? 'firefox/firefox.exe' : 'chrome-win64/chrome.exe');
      if (existsSync(path)) { options.executablePath = path; break; }
    }
  }
  const browser = await engine.launch(options);
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.route(`${url}/alignment-harness`, route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
    await page.goto(`${url}/alignment-harness`);
    await page.evaluate(async () => {
      await import('/src/styles.css');
      const { Gallery } = await import('/src/gallery/Gallery.ts');
      const cards = Array.from({ length: 1000 }, (_, index) => ({ id: String(index), title: `Card ${index}`, franchise: 'Original',
        set: 'Test', number: String(index), front: '/front.png', back: '/back.png', profile: 'print-only', seed: index,
        dimensions: { width: index % 2 ? 6 : 6.3, height: index % 2 ? 8.4 : 8.8, thickness: .032, cornerRadius: .3, bevel: .007 } }));
      const canvas = document.createElement('canvas'); canvas.width = innerWidth; canvas.height = innerHeight;
      Object.assign(canvas.style, { position: 'fixed', inset: '0', pointerEvents: 'none' }); document.body.append(canvas);
      const context = canvas.getContext('2d'), placements = new Map();
      const cpu = { hasPreview: () => false, cachedPreview: () => undefined,
        preparePreview: (_card, signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })) };
      const lighting = { preset: 'Studio', elevation: 28, intensity: 1, speed: 1, filterAngle: 0, update() {}, setPreset() {} };
      const gallery = new Gallery({ cards, scene: { add() {} }, camera: {}, cpu, lighting,
        compile: async () => {}, open: async () => {}, close: async () => {}, pack: async () => {} });
      gallery.graphics.dispose();
      gallery.graphics = { mesh: {}, dispose() {}, upload: async () => {}, updateLighting() {},
        hideAll() { placements.clear(); context.clearRect(0, 0, canvas.width, canvas.height); },
        place(slot, x, y, width, height) {
          placements.set(slot, { x, y, width, height });
          context.fillStyle = '#34535f'; context.fillRect(x - width / 2, y - height / 2, width, height);
        }, stats: () => ({ visible: placements.size }) };
      gallery.initialPositionPending = false; gallery.active = true; gallery.root.hidden = false; gallery.filtered = cards;
      // Keep half the cards loading, with the worker queue saturated throughout.
      const tick = () => {
        gallery.reconcile();
        for (const item of gallery.assigned) gallery.entries.get(item.slot).ready = Number(item.id) % 2 === 0;
        gallery.update(1 / 60, innerWidth, innerHeight);
      };
      const snapshot = () => [...gallery.buttons].map(([id, button]) => {
        const bounds = button.firstElementChild.getBoundingClientRect(), label = button.querySelector('.gallery-card-name').getBoundingClientRect();
        const item = gallery.assigned.find(item => item.id === id), image = item && placements.get(item.slot);
        return { id, x: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height, labelTop: label.top, image };
      });
      window.alignment = { gallery, tick, snapshot };
      gallery.viewport.scrollTop = gallery.layout.row * 3; tick();
    });
    const before = await page.evaluate(() => alignment.snapshot());
    assert.ok(before.some(card => card.image), `${name}: the stalled frame must include rendered cards`);
    await page.evaluate(() => { alignment.gallery.viewport.scrollTop += 73; });
    await page.mouse.move(600, 400); await page.mouse.wheel(0, 89);
    await page.waitForTimeout(200);
    const stalled = await page.evaluate(() => ({ cards: alignment.snapshot(), pending: alignment.gallery.stats().pending,
      scroll: alignment.gallery.viewport.scrollTop, renderedScroll: alignment.gallery.lastScroll }));
    assert.ok(stalled.scroll > stalled.renderedScroll + 73, `${name}: native wheel input must advance scroll while rendering is paused`);
    assert.equal(stalled.pending, 4, `${name}: preview preparation must remain saturated`);
    assert.deepEqual(stalled.cards, before, `${name}: HTML placeholders/captions must stay with the last rendered card frame`);
    await page.screenshot({ path: join(out, `${name}-stalled.png`) });
    await page.evaluate(() => alignment.tick());
    const resumed = await page.evaluate(() => alignment.snapshot());
    assert.notEqual(resumed[0].top, before[0].top, `${name}: the next frame must advance the HTML layer`);
    const checkAlignment = cards => {
      for (const card of cards) {
        assert.ok(Math.abs(card.labelTop - card.top - card.height - 13) < .1, `${name}: captions must sit below their card`);
        if (!card.image) continue;
        assert.ok(Math.abs(card.top - (card.image.y - card.image.height / 2)) < .1, `${name}: image and placeholder top must match`);
        assert.ok(Math.abs(card.x - (card.image.x - card.image.width / 2)) < .1, `${name}: image and placeholder left must match`);
      }
    };
    checkAlignment(resumed);
    await page.screenshot({ path: join(out, `${name}-resumed.png`) });
    const focus = await page.evaluate(() => {
      const { gallery } = alignment, before = gallery.viewport.scrollTop;
      const target = [...gallery.buttons.values()].findLast(button => button.getBoundingClientRect().bottom > gallery.viewport.getBoundingClientRect().bottom);
      target.focus({ preventScroll: true });
      const bounds = target.getBoundingClientRect(), viewport = gallery.viewport.getBoundingClientRect();
      return { changed: gallery.viewport.scrollTop !== before, visible: bounds.top >= viewport.top - .1 && bounds.bottom <= viewport.bottom + .1 };
    });
    assert.ok(focus.changed && focus.visible, `${name}: focusing an overscan card must reveal it in the pinned overlay`);
    // Keyboard navigation must still scroll, virtualize and focus the target.
    await page.evaluate(() => {
      const { gallery } = alignment;
      gallery.buttons.get(gallery.assigned[0].id).focus({ preventScroll: true });
    });
    await page.keyboard.press('End'); await page.evaluate(() => alignment.tick());
    assert.equal(await page.evaluate(() => document.activeElement.dataset.cardIndex), '999');
    checkAlignment(await page.evaluate(() => alignment.snapshot()));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { alignment.gallery.viewport.scrollTop = 0; alignment.tick(); });
    checkAlignment(await page.evaluate(() => alignment.snapshot()));
    await page.screenshot({ path: join(out, `${name}-mobile.png`) });
    await page.evaluate(() => alignment.gallery.dispose());
    assert.deepEqual(errors, []);
    report.push({ browser: name, passed: ['paused rendering with saturated loading', 'native wheel scrolling', 'resumed alignment', 'focus scrolling', 'keyboard navigation', 'mobile resize'] });
  } finally { await browser.close(); }
}
await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
