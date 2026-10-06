import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const out = join(process.cwd(), 'artifacts/binder-natural');
await mkdir(out, { recursive: true });
let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) {
  for (const dir of (await readdir(join(process.env.LOCALAPPDATA, 'ms-playwright'))).filter(n => /^chromium-/.test(n)).sort().reverse()) {
    const candidate = join(process.env.LOCALAPPDATA, 'ms-playwright', dir, 'chrome-win64/chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } });
const errors = [], captures = [];
page.on('pageerror', error => errors.push(String(error)));
try {
  await page.routeWebSocket('**', socket => socket.close());
  await page.goto(process.env.BINDER_URL || 'http://127.0.0.1:5173/?backend=webgpu', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__holo?.gallery.stats()?.active, null, { timeout: 120000 });
  await page.evaluate(() => {
    const gallery = window.__holo.gallery.instance();
    gallery.favorites.ids = new Set(); gallery.openBinder();
  });
  await page.waitForFunction(() => { const s = window.__holo.gallery.stats(); return s.binder && !s.preparing && !s.pending; }, null, { timeout: 120000 });
  for (const [name, lighting, x, y] of [
    ['front-soft', 'Soft', -.065, 0],
    ['tilt-soft', 'Soft', -.27, .23],
    ['grazing-soft', 'Soft', .3, -.32],
    ['tilt-studio', 'Studio', -.22, -.2],
  ]) {
    const select = page.getByLabel('Gallery lighting', { exact: true }).last();
    const available = await select.locator('option').allTextContents();
    if (available.includes(lighting)) await select.selectOption({ label: lighting });
    await page.evaluate(({ x, y }) => { const b = window.__holo.gallery.instance().binder; b.tilt.targetX = x; b.tilt.targetY = y; }, { x, y });
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(out, `${name}.png`) }); captures.push(name);
  }
  const start = await page.evaluate(() => window.__holo.gallery.stats().spread);
  const direction = start < 20 ? 1 : -1;
  await page.evaluate(direction => window.__holo.gallery.instance().binder.turn(direction), direction);
  await page.waitForFunction(target => { const s = window.__holo.gallery.stats(); return s.spread === target && !s.turning; }, start + direction, { timeout: 60000 });
  await page.screenshot({ path: join(out, 'turned-page.png') }); captures.push('turned-page');
  await page.evaluate(() => {
    const gallery = window.__holo.gallery.instance(), cards = gallery.catalog.cards().slice(0, 36);
    gallery.favorites.ids = new Set(cards.map(card => card.id)); gallery.binder.refresh(cards);
    gallery.binder.tilt.targetX = -.065; gallery.binder.tilt.targetY = 0;
  });
  await page.waitForFunction(() => { const s = window.__holo.gallery.stats(); return !s.preparing && !s.pending && s.visible === s.visibleExpected && s.visible > 0 && !s.visibleFailed; }, null, { timeout: 240000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(out, 'cards-front.png') }); captures.push('cards-front');
  const geometry = await page.evaluate(() => {
    const group = window.__holo.gallery.instance().binder.physical.group;
    if (group.getObjectByName('sewn-spine-cap') || group.getObjectByName('continuous-fabric-spine')) throw new Error('Raised center bar remains');
    return ['continuous-gutter-backing', 'sewn-fabric-gutter', 'shaped-zipper-tape'].map(name => {
      const mesh = group.getObjectByName(name); mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox;
      return { name, min: box.min.toArray(), max: box.max.toArray() };
    });
  });
  assert.ok(geometry[0].min[1] < -17.1 && geometry[0].max[1] > 17.1 && geometry[0].max[2] > 0, 'gutter backing fills both end gaps through the zipper edge');
  assert.ok(geometry[1].max[2] < .15, 'fabric gutter stays low without a raised center bar');
  assert.ok(geometry[2].max[2] - geometry[2].min[2] > .25, 'tape retains thickness');
  assert.deepEqual(errors, []);
  await writeFile(join(out, 'review.json'), JSON.stringify({ captures, geometry, errors }, null, 2));
  console.log(JSON.stringify({ captures, geometry, errors }));
} finally { await browser.close(); }
