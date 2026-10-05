import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const label = process.argv[2] || 'current';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = []; page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://127.0.0.1:5173/');
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
for (const [name, id] of [['cold-etched', 'sv08.5-156:holo'], ['repeat-etched', 'sv08.5-156:holo'], ['cold-holo', 'alakazam-base-set'], ['repeat-holo', 'alakazam-base-set']]) {
  results.push(await page.evaluate(async ([name, id]) => {
    const h = window.__holo;
    if (!h.cards.some(c => c.id === id)) throw new Error(`Unknown benchmark card ${id}`);
    window.openSamples = []; const start = performance.now();
    await h.gallery.close(id);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const result = { name, id, ms: performance.now() - start, stages: window.openSamples, stats: h.stats(), opening: h.opening?.() };
    await h.gallery.open(); return result;
  }, [name, id]));
}
await mkdir(`artifacts/card-opening-${label}`, { recursive: true });
await writeFile(`artifacts/card-opening-${label}/report.json`, JSON.stringify({ results, errors }, null, 2));
console.log(JSON.stringify({ times: results.map(({name,ms,stages})=>({name,ms,stages})), errors }, null, 2));
await browser.close();
