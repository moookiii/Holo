import { chromium, firefox } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const url = process.env.GALLERY_URL || 'http://127.0.0.1:4180/Holo/?backend=webgl';
const out = resolve('artifacts/gallery-cache', process.env.GALLERY_RUN || 'after');
await mkdir(out, { recursive: true });
const browserName = process.env.GALLERY_BROWSER || 'firefox', engine = browserName === 'chromium' ? chromium : firefox;
const options = { headless: true, viewport: { width: 1440, height: 1100 },
  ...(browserName === 'chromium' ? { args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] } : {}) };
if (!existsSync(engine.executablePath())) {
  for (const version of (await readdir(join(process.env.LOCALAPPDATA, 'ms-playwright'))).filter(name => name.startsWith(browserName + '-')).sort().reverse()) {
    const path = join(process.env.LOCALAPPDATA, 'ms-playwright', version, ...(browserName === 'firefox' ? ['firefox', 'firefox.exe'] : ['chrome-win64', 'chrome.exe']));
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const report = { url, browserName, phases: [], errors: [] };
let context, page;
async function launch() {
  context = await engine.launchPersistentContext(join(out, 'profile'), options);
  page = context.pages()[0] || await context.newPage();
  page.on('pageerror', error => report.errors.push(String(error)));
  await page.addInitScript(() => {
    window.__frames = [];
    let last;
    const tick = now => { if (last) { if (window.__frames.length > 4000) window.__frames.shift(); window.__frames.push(now - last); } last = now; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}
async function ready() {
  await page.waitForFunction(() => {
    const g = window.__holo?.gallery.instance(), s = g?.stats();
    return g?.active && !g.dirty && s.visibleExpected > 0 && s.visible === s.visibleExpected && !s.visibleFailed && !s.pending;
  }, null, { timeout: 120000 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
const snapshot = () => page.evaluate(() => {
  const h = window.__holo, frames = window.__frames.slice().sort((a, b) => a - b);
  return { gallery: h.gallery.stats(), cpu: h.cpuPreparation.stats(), factory: h.factory.stats(),
    frameP95: frames[Math.floor(frames.length * .95)], frameMax: frames.at(-1), framesOver50: frames.filter(n => n > 50).length,
    textures: h.renderer.info.memory.textures };
});
async function phase(name, action, viewer = false) {
  if (page.url() !== 'about:blank') await page.evaluate(() => { window.__frames = []; });
  const start = Date.now(); await action();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if (viewer) await page.waitForFunction(() => !window.__holo.gallery.instance().active && document.querySelector('#loading').hidden
    && getComputedStyle(document.querySelector('#loading')).opacity === '0', null, { timeout: 120000 });
  else await ready();
  const row = { name, ms: Date.now() - start, ...await snapshot() }; report.phases.push(row);
  await page.screenshot({ path: join(out, `${name}.png`) });
  console.log(JSON.stringify({ name, ms: row.ms, uploads: row.gallery.uploads, prepared: row.cpu.previewPreparations, persistentHits: row.cpu.persistentPreviewHits }));
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); return row;
}
try {
  await launch();
  const cold = await phase('cold', () => page.goto(url, { waitUntil: 'domcontentloaded' }));
  assert.ok(cold.gallery.filtered > 1000);
  const hover = await phase('hover-neighbors', async () => {
    await page.evaluate(() => { window.__holo.lighting.setPreset('Studio'); window.__holo.lighting.playing = false; });
    for (const x of [350, 550, 750, 950, 750]) { await page.mouse.move(x, 470, { steps: 12 }); await page.waitForTimeout(80); }
  });
  assert.equal(hover.gallery.uploads, cold.gallery.uploads, 'Hover must not realize assets');
  assert.equal(hover.gallery.materials, cold.gallery.materials, 'Hover must not construct materials');
  assert.equal(hover.cpu.previewPreparations, cold.cpu.previewPreparations, 'Hover must not trigger preparation');
  assert.ok(hover.gallery.tilted >= 2, 'Proximity must influence multiple cards');
  await page.mouse.move(0, 0);
  const scroll = await phase('scroll-new', () => page.locator('.gallery-viewport').evaluate(el => { el.scrollTop += el.clientHeight; }));
  const back = await phase('scroll-back', () => page.locator('.gallery-viewport').evaluate(el => { el.scrollTop = 0; }));
  assert.equal(back.gallery.uploads, scroll.gallery.uploads, 'Nearby scroll-back must reuse GPU residents');
  await phase('fast-scroll', async () => {
    await page.locator('.gallery-viewport').evaluate(async el => {
      for (let step = 1; step <= 16; step++) { el.scrollTop = step * el.clientHeight * 2; await new Promise(resolve => requestAnimationFrame(resolve)); }
    });
  });
  const revisited = await phase('revisit-evicted', () => page.locator('.gallery-viewport').evaluate(el => { el.scrollTop = 0; }));
  assert.ok(revisited.cpu.previewBytes <= revisited.cpu.previewBudget);
  assert.ok(revisited.gallery.gpuAllocatedBytes <= revisited.gallery.gpuBudgetBytes);
  await phase('rapid-filters', async () => {
    const search = page.getByRole('searchbox', { name: 'Search gallery cards' });
    for (const text of ['Sylveon', 'Umbreon', 'Charizard', 'Lugia']) await search.fill(text);
  });
  const labels = await page.locator('.gallery-card').evaluateAll(cards => cards.map(card => card.getAttribute('aria-label')));
  assert.ok(labels.every(label => /Lugia/i.test(label)), 'No stale filtered cards');
  await phase('resize-wide', async () => {
    await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill(''); await page.setViewportSize({ width: 2026, height: 1400 });
  });
  await phase('resize-narrow', () => page.setViewportSize({ width: 900, height: 900 }));
  await page.setViewportSize(options.viewport);
  // Click the actual button while an uncached set is still preparing.
  await phase('open-before-preview-ready', async () => {
    await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill('Sylveon');
    await page.waitForFunction(() => [...document.querySelectorAll('.gallery-card')].some(card => /Sylveon/.test(card.getAttribute('aria-label'))));
    await page.locator('.gallery-card').first().click();
  }, true);
  await phase('return-from-viewer', () => page.getByRole('button', { name: 'Gallery', exact: true }).click());
  await phase('restore-start', () => page.getByRole('searchbox', { name: 'Search gallery cards' }).fill(''));
  const reload = await phase('reload', () => page.reload({ waitUntil: 'domcontentloaded' }));
  if (!process.env.GALLERY_BASELINE) assert.ok(reload.cpu.persistentPreviewHits >= 7, 'Reload must bypass preparation for local authored fronts');
  await context.close(); await launch();
  const restart = await phase('browser-restart', () => page.goto(url, { waitUntil: 'domcontentloaded' }));
  if (!process.env.GALLERY_BASELINE) assert.ok(restart.cpu.persistentPreviewHits >= 7, 'Cache must survive Firefox shutdown');
  assert.deepEqual(report.errors, []);
} catch (error) { report.failure = String(error); process.exitCode = 1; console.error(error); }
finally { await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); await context?.close(); }
