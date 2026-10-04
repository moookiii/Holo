import { firefox } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const url = process.env.GALLERY_URL || 'http://127.0.0.1:5174/';
const label = process.env.GALLERY_RUN || 'baseline';
const out = join(process.cwd(), 'artifacts', 'gallery-firefox', label);
await mkdir(out, { recursive: true });
const options = { headless: true };
if (!existsSync(firefox.executablePath())) {
  for (const folder of (await readdir(join(process.env.LOCALAPPDATA, 'ms-playwright'))).filter(name => /^firefox-\d+$/.test(name)).sort().reverse()) {
    const path = join(process.env.LOCALAPPDATA, 'ms-playwright', folder, 'firefox', 'firefox.exe');
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const browser = await firefox.launch(options);
const report = { browser: 'Firefox', url, viewport: { width: 1440, height: 1100 }, phases: [], errors: [], requests: [] };
const page = await browser.newPage({ viewport: report.viewport, deviceScaleFactor: 1 });
page.on('pageerror', error => report.errors.push(String(error)));
const requests = new Map();
page.on('request', request => requests.set(request, Date.now()));
page.on('requestfinished', async request => {
  if (/\.(png|jpg|webp|svg|bin)(\?|$)/.test(request.url())) report.requests.push({ url: request.url(), ms: Date.now() - requests.get(request), status: (await request.response())?.status() });
});
page.on('requestfailed', request => report.requests.push({ url: request.url(), ms: Date.now() - requests.get(request), error: request.failure()?.errorText }));
await page.addInitScript(() => {
  window.__galleryBench = { preparations: [], compilations: [] };
  let debug;
  Object.defineProperty(window, '__holo', { configurable: true, get: () => debug, set(value) {
    debug = value;
    const prepare = value.cpuPreparation.preparePreview.bind(value.cpuPreparation);
    value.cpuPreparation.preparePreview = async (card, signal) => {
      const row = { id: card.id, start: performance.now() }; window.__galleryBench.preparations.push(row);
      try { return await prepare(card, signal); } catch (error) { row.error = String(error); throw error; }
      finally { row.ms = performance.now() - row.start; }
    };
    const compile = value.factory.compile.bind(value.factory);
    value.factory.compile = async mesh => {
      const row = { name: mesh.name, start: performance.now() }; window.__galleryBench.compilations.push(row);
      try { return await compile(mesh); } finally { row.ms = performance.now() - row.start; }
    };
  } });
});
async function state() {
  return page.evaluate(() => {
    const h = window.__holo, gallery = h?.gallery.instance(), viewport = document.querySelector('.gallery-viewport')?.getBoundingClientRect();
    const cards = viewport ? [...document.querySelectorAll('.gallery-card')].filter(card => {
      const bounds = card.getBoundingClientRect(), height = parseFloat(card.style.getPropertyValue('--card-height'));
      return bounds.top <= viewport.bottom && bounds.top + height >= viewport.top;
    }) : [];
    return { gallery: gallery?.stats(), cpu: h?.cpuPreparation.stats(), loading: !document.querySelector('#loading')?.hidden,
      visibleCards: cards.length, readyCards: cards.filter(card => card.classList.contains('is-ready')).length,
      entries: gallery ? [...gallery.entries].filter(([, entry]) => entry.error).map(([slot, entry]) => ({ slot, error: entry.error })) : [],
      instrumentation: window.__galleryBench, startup: h?.startupTiming };
  });
}
async function measure(name, action) {
  const started = Date.now();
  if (action) await action();
  // Scroll events/layout must reach the renderer before inspecting its old flags.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  let timeout;
  try {
    await page.waitForFunction(() => {
      const g = window.__holo?.gallery.instance(), viewport = document.querySelector('.gallery-viewport')?.getBoundingClientRect();
      if (!g?.active || g.dirty || !viewport || !document.querySelector('#loading')?.hidden) return false;
      const cards = [...document.querySelectorAll('.gallery-card')].filter(card => {
        const b = card.getBoundingClientRect(), height = parseFloat(card.style.getPropertyValue('--card-height'));
        return b.top <= viewport.bottom && b.top + height >= viewport.top;
      });
      return cards.length > 0 && cards.every(card => card.classList.contains('is-ready')) && g.stats().visible >= cards.length;
    }, null, { timeout: 45000, polling: 'raf' });
    // Include a presentation frame; ready flags alone cannot prove the cards painted.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())));
  } catch (error) { timeout = String(error); }
  const row = { name, ms: Date.now() - started, timeout, ...await state() };
  if (row.readyCards !== row.visibleCards || row.gallery?.visible < row.visibleCards) row.timeout ??= 'Visible cards were not ready on the presented frame';
  report.phases.push(row); await page.screenshot({ path: join(out, `${name}.png`) });
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ name, ms: row.ms, timeout, visible: row.visibleCards, ready: row.readyCards, failed: row.gallery?.failed, cpu: row.cpu }));
  return !timeout;
}
try {
  if (await measure('cold-navigation', () => page.goto(url, { waitUntil: 'domcontentloaded' }))) {
    await measure('scroll-new', () => page.locator('.gallery-viewport').evaluate(el => { el.scrollTop += el.clientHeight; }));
    await measure('scroll-return', () => page.locator('.gallery-viewport').evaluate(el => { el.scrollTop = 0; }));
    await measure('search-lugia', () => page.getByRole('searchbox', { name: 'Search gallery cards' }).fill('Lugia'));
    await measure('search-clear', () => page.getByRole('searchbox', { name: 'Search gallery cards' }).fill(''));
    await page.evaluate(() => window.__holo.gallery.close());
    await measure('open-from-viewer', () => page.getByRole('button', { name: 'Gallery', exact: true }).click());
  }
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
if (report.phases.some(phase => phase.timeout) || report.errors.length) process.exitCode = 1;
