import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const label = process.argv[2] || 'current';
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || chromium.executablePath(), headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = []; page.on('pageerror', e => errors.push(String(e)));
await page.goto(process.env.PROFILE_URL || 'http://127.0.0.1:5173/');
await page.waitForFunction(() => window.__holo?.gallery.stats()?.visible > 0, null, { timeout: 120000 });
await page.evaluate(() => {
  window.openSamples = [];
  const proto = window.__holo.factory.constructor.prototype;
  for (const method of ['create', 'realizeCardGpu', 'uploadCardResources', 'compile', 'prepareProfile']) {
    const original = proto[method];
    proto[method] = async function (...args) {
      const start = performance.now();
      try { return await original.apply(this, args); }
      finally { window.openSamples.push({ method, ms: performance.now() - start }); }
    };
  }
});
const results = [];
await mkdir(`artifacts/card-opening-${label}`, { recursive: true });
const sampleIds = await page.evaluate(() => {
  const h = window.__holo, g = h.gallery.instance();
  return { visible: g.filtered[Number(document.querySelector('.gallery-card').dataset.cardIndex)].id,
    print: h.cards.find(c => c.profile === 'print-only' && !c.imported && !c.construction).id };
});
for (const [name, id] of [['cold-etched', 'pokemon:sv08.5-156:holo'], ['repeat-etched', 'pokemon:sv08.5-156:holo'], ['cold-holo', 'alakazam-base-set'], ['repeat-holo', 'alakazam-base-set'], ['already-in-gallery', sampleIds.visible], ['non-holo', sampleIds.print], ['repeat-non-holo', sampleIds.print]]) {
  results.push(await page.evaluate(async ([name, id]) => {
    const h = window.__holo;
    if (!h.cards.some(c => c.id === id)) throw new Error(`Unknown benchmark card ${id}`);
    window.openSamples = []; const start = performance.now();
    await h.gallery.close(id);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const result = { name, id, ms: performance.now() - start, stages: window.openSamples, stats: h.stats(), opening: h.opening?.() };
    h.lighting.playing = false; h.pose(-15, -10, 0);
    return result;
  }, [name, id]));
  await page.waitForTimeout(150);
  await page.screenshot({ path: `artifacts/card-opening-${label}/${name}.png` });
  await page.evaluate(() => window.__holo.gallery.open());
}
// Real Gallery pointer hover followed immediately by a click, then settled hover.
for (const [name, delay] of [['hover-immediate', 10], ['hover-prepared', 2000]]) {
  const button = page.locator('.gallery-card').first();
  await button.hover(); await page.waitForTimeout(delay);
  const start = Date.now(); await button.click();
  await page.waitForFunction(() => !window.__holo.gallery.stats().active && document.querySelector('#loading').hidden, null, { timeout: 120000 });
  results.push({ name, ms: Date.now() - start, stats: await page.evaluate(() => window.__holo.stats()), opening: await page.evaluate(() => window.__holo.opening?.()) });
  await page.evaluate(() => window.__holo.gallery.open());
  await page.mouse.move(0, 0);
}
results.push(await page.evaluate(async () => {
  const h = window.__holo, ids = ['alakazam-base-set', 'pokemon:sv08.5-156:holo', 'alakazam-base-set'];
  await Promise.all(ids.map(id => h.gallery.close(id)));
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (h.stats().card !== ids.at(-1)) throw Error('Stale card won rapid switching');
  return { name: 'rapid-switch', stats: h.stats(), opening: h.opening?.() };
}));
await page.reload();
await page.waitForFunction(() => window.__holo?.gallery.stats()?.visible > 0, null, { timeout: 120000 });
results.push(await page.evaluate(async () => {
  const start = performance.now(); await window.__holo.gallery.close('pokemon:sv08.5-156:holo');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { name: 'persistent-reload', ms: performance.now() - start, opening: window.__holo.opening?.() };
}));
await writeFile(`artifacts/card-opening-${label}/report.json`, JSON.stringify({ results, errors }, null, 2));
console.log(JSON.stringify({ times: results.map(({name,ms,stages})=>({name,ms,stages})), errors }, null, 2));
await browser.close();

