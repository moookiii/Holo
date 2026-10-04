import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const baseUrl = process.env.GALLERY_URL || 'http://127.0.0.1:5173';
const out = join(process.cwd(), 'artifacts', 'gallery-loading');
await mkdir(out, { recursive: true });
const options = { headless: true };
if (!existsSync(chromium.executablePath())) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(base)).filter(name => /^chromium-\d+$/.test(name)).sort().reverse()) {
    const path = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const browser = await chromium.launch(options);
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  // Exercise the real scheduler with controlled preparation/compilation delays.
  // External assets and GPU driver timings cannot obscure ordering assertions.
  await page.route(`${baseUrl}/scheduling-harness`, route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
  await page.goto(`${baseUrl}/scheduling-harness`);
  const report = await page.evaluate(async () => {
    const { Gallery } = await import('/src/gallery/Gallery.ts');
    const { CardPreviewCache } = await import('/src/card/CardPreviewCache.ts');
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const preview = { images: [new Uint8Array([12, 34, 56, 255])], parameters: new Float32Array([1]) };
    function harness(scrollRows = 0) {
      const cards = Array.from({ length: 120 }, (_, i) => ({ id: String(i), title: `Card ${i}`, franchise: 'Original',
        set: 'Test', number: String(i), front: '/front.png', back: '/back.png', profile: 'print-only', seed: i,
        dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 } }));
      const cache = new CardPreviewCache(), jobs = [], uploads = [];
      const cpu = { cachedPreview: card => cache.get(card), preparePreview: (card, signal) => new Promise((resolve, reject) => {
        const job = { card, signal, complete: () => { cache.set(card, preview); resolve(preview); } };
        jobs.push(job); signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }) };
      const lighting = { preset: 'Studio', elevation: 28, intensity: 1, speed: 1, filterAngle: 0, update() {}, setPreset() {} };
      const gallery = new Gallery({ cards, scene: { add() {} }, camera: {}, cpu, lighting,
        compile: async () => {}, open: async () => {}, close: async () => {}, pack: async () => {} });
      gallery.graphics.dispose();
      gallery.graphics = { mesh: {}, hideAll() {}, updateLighting() {}, place() {}, stats: () => ({ visible: 0 }),
        upload: async (slot, bytes) => { uploads.push({ slot, bytes }); }, dispose() {} };
      gallery.root.hidden = false; gallery.active = true; gallery.filtered = cards;
      Object.assign(gallery.viewport.style, { position: 'fixed', top: '0', left: '0', width: '1200px', height: '800px' });
      gallery.reconcile(); gallery.viewport.scrollTop = scrollRows * gallery.layout.row; gallery.dirty = true;
      const tick = () => gallery.update(1 / 60, 1440, 1100);
      const visible = () => {
        const rect = gallery.viewport.getBoundingClientRect();
        return [...gallery.buttons].filter(([, button]) => {
          const bounds = button.getBoundingClientRect(), height = parseFloat(button.style.getPropertyValue('--card-height'));
          return bounds.top + height >= rect.top && bounds.top <= rect.bottom;
        }).map(([id]) => id);
      };
      return { gallery, cards, cache, jobs, uploads, tick, visible };
    }
    const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
    const first = harness(4); first.tick();
    check(first.jobs.length === 4 && first.jobs.every(job => first.visible().includes(job.card.id)), 'Visible previews must take all four slots before overscan');
    const cachedCard = first.cards.find(card => first.visible().includes(card.id) && !first.jobs.some(job => job.card.id === card.id));
    first.cache.set(cachedCard, preview); first.tick();
    check(first.jobs.length === 4 && first.uploads.length === 1 && first.uploads[0].bytes === preview, 'Cached visible preview must upload while all worker slots are occupied');
    // Reassign slots before canceled completions arrive.
    const oldJobs = [...first.jobs]; first.gallery.viewport.scrollTop += first.gallery.layout.row * 8;
    first.gallery.dirty = true; first.tick();
    check(oldJobs.every(job => job.signal.aborted), 'Stale requests must be canceled immediately after reassignment');
    oldJobs.forEach(job => job.complete()); await flush();
    check(first.gallery.requests.size === 4 && [...first.gallery.entries.values()].every(entry => !entry.preview), 'Stale completions must not alter replacement entries or remove new requests');
    first.gallery.hide(); check(first.gallery.requests.size === 0, 'Hiding the gallery must free all request slots');
    first.gallery.dispose();

    const scroll = harness(4); scroll.tick();
    for (const slot of scroll.gallery.requests.keys()) scroll.gallery.cancelRequest(slot);
    for (const item of scroll.gallery.assigned) if (scroll.visible().includes(item.id)) scroll.gallery.entries.get(item.slot).ready = true;
    scroll.tick();
    const overscanJobs = scroll.jobs.filter(job => !job.signal.aborted);
    check(overscanJobs.length === 4 && overscanJobs.every(job => !scroll.visible().includes(job.card.id)), 'Overscan should prepare when visible cards are ready');
    scroll.gallery.viewport.scrollTop -= scroll.gallery.layout.row * .4; scroll.gallery.dirty = true; scroll.tick();
    check(overscanJobs.some(job => job.signal.aborted), 'Retained offscreen work must yield to newly visible cards');
    check(scroll.jobs.filter(job => !job.signal.aborted).every(job => scroll.visible().includes(job.card.id)), 'Newly visible cards must receive the freed slots');
    scroll.gallery.dispose();
    return { passed: ['visible priority', 'cache bypass', 'stale cancellation', 'hide cancellation', 'overscan preemption'], concurrency: 4 };
  });
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
