import { chromium } from 'playwright';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const base = process.env.GALLERY_URL || 'http://127.0.0.1:5173';
const out = join(process.cwd(), 'artifacts', 'gallery-cold-viewer');
await mkdir(out, { recursive: true });
const options = { headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] };
if (!existsSync(chromium.executablePath())) {
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(root)).filter(name => /^chromium-\d+$/.test(name)).sort().reverse()) {
    const path = join(root, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const browser = await chromium.launch(options);
const previous = process.env.GALLERY_RESUME && existsSync(join(out, 'report.json'))
  ? JSON.parse(await readFile(join(out, 'report.json'), 'utf8')) : undefined;
const report = previous ?? { date: new Date().toISOString(), browser: browser.version(), url: base,
  definition: 'Gallery card preview ready to first full-quality viewer frame submitted', samples: [] };
try {
  const catalogContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const catalogPage = await catalogContext.newPage();
  await catalogPage.goto(`${base}/?benchmark-cold-viewer=1`, { waitUntil: 'domcontentloaded' });
  await catalogPage.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  const targets = await catalogPage.evaluate(async () => {
    const { filterCards } = await import('/src/gallery/GalleryQuery.ts');
    const cards = filterCards(window.__holo.cards, { search: '' });
    const targets = new Map();
    for (const card of cards) {
      if (card.profile === 'print-only') continue;
      if (!targets.has(card.profile)) targets.set(card.profile, { id: card.id, title: card.title, profile: card.profile });
    }
    return [...targets.values()];
  });
  await catalogContext.close();
  report.targetCount = targets.length;
  for (const target of targets) {
    if (report.samples.some(sample => sample.id === target.id && !sample.error)) continue;
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const sample = { ...target };
    const priorIndex = report.samples.findIndex(item => item.id === target.id);
    if (priorIndex < 0) report.samples.push(sample); else report.samples[priorIndex] = sample;
    try {
      await page.goto(`${base}/?benchmark-cold-viewer=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
      await page.evaluate(() => window.__holo.gallery.open());
      await page.locator('.gallery-card.is-ready').first().waitFor({ timeout: 120000 });
      await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill(target.title);
      const index = await page.evaluate(id => {
        const gallery = window.__holo.gallery.instance();
        const index = gallery.filtered.findIndex(card => card.id === id);
        if (index >= 0) { gallery.viewport.scrollTop = Math.floor(index / gallery.layout.columns) * gallery.layout.row; gallery.dirty = true; }
        return index;
      }, target.id);
      if (index < 0) throw new Error('Target absent from gallery filter');
      const button = page.locator(`.gallery-card[data-card-id="${target.id}"]`);
      await button.waitFor({ timeout: 120000 });
      await button.evaluate(element => element.scrollIntoView());
      await page.waitForFunction(id => document.querySelector(`.gallery-card[data-card-id="${id}"]`)?.classList.contains('is-ready'), target.id, { timeout: 120000 });
      sample.galleryReadyAt = await page.evaluate(() => performance.now());
      await button.evaluate(element => element.click());
      await page.waitForFunction(id => {
        const event = window.__holo.opening().events.findLast(event => event.id === id);
        return event?.marks.fullQualityFrameSubmitted !== undefined && !window.__holo.gallery.stats().active && document.querySelector('#loading').hidden;
      }, target.id, { timeout: 120000 });
      const timing = await page.evaluate(id => {
        const event = window.__holo.opening().events.findLast(event => event.id === id);
        return { at: event.at, marks: event.marks, stats: window.__holo.stats(), resources: window.__holo.opening().resources };
      }, target.id);
      sample.clickToFrameMs = +(timing.at + timing.marks.fullQualityFrameSubmitted - sample.galleryReadyAt).toFixed(1);
      sample.openingMarks = timing.marks;
      sample.residentHit = timing.marks.residentHit !== undefined;
      sample.backend = timing.stats.backend;
      sample.frameMs = timing.stats.frameMs;
      if (sample.residentHit) sample.error = 'Viewer resource was resident; this sample is not cold';
      console.log(`${target.profile}: ${sample.clickToFrameMs} ms${sample.error ? ` (${sample.error})` : ''}`);
    } catch (error) { sample.error = String(error); console.error(`${target.profile}: ${sample.error}`); }
    finally { await context.close(); await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); }
  }
  if (report.samples.some(sample => sample.error)) process.exitCode = 1;
} finally { await browser.close(); }
