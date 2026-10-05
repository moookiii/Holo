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
    const { GalleryUploadBudget } = await import('/src/gallery/GalleryUploadBudget.ts');
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const preview = { images: [new Uint8Array([12, 34, 56, 255])], parameters: new Float32Array([1]) };
    function harness(scrollRows = 0) {
      const cards = Array.from({ length: 1000 }, (_, i) => ({ id: String(i), title: `Card ${i}`, franchise: 'Original',
        set: 'Test', number: String(i), front: '/front.png', back: '/back.png', profile: 'print-only', seed: i,
        dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 } }));
      const cache = new CardPreviewCache(), jobs = [], uploads = [];
      const cpu = { hasPreview: card => cache.has(card), cachedPreview: card => cache.get(card), preparePreview: (card, signal) => new Promise((resolve, reject) => {
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
    const jobsBeforeScroll = scroll.jobs.length;
    scroll.gallery.viewport.scrollTop -= scroll.gallery.layout.row * .4; scroll.gallery.dirty = true; scroll.tick();
    check(overscanJobs.some(job => job.signal.aborted), 'Retained offscreen work must yield to newly visible cards');
    const foregroundJobs = scroll.jobs.slice(jobsBeforeScroll);
    check(foregroundJobs.length > 0 && scroll.visible().includes(foregroundJobs[0].card.id), 'Newly visible cards must receive the first freed slot');
    check(scroll.gallery.requests.size + scroll.gallery.nearRequests.size <= 4, 'Preemption must retain the four-request concurrency limit');
    check(scroll.gallery.assigned.every(item => scroll.visible().includes(item.id)), 'CPU overscan must not take GPU residency slots');
    scroll.gallery.dispose();
    const promotion = harness(4); promotion.tick();
    for (const slot of promotion.gallery.requests.keys()) promotion.gallery.cancelRequest(slot);
    for (const item of promotion.gallery.assigned) promotion.gallery.entries.get(item.slot).ready = true;
    promotion.tick();
    const prefetched = promotion.jobs.find(job => !job.signal.aborted);
    promotion.gallery.viewport.scrollTop = Math.floor(Number(prefetched.card.id) / promotion.gallery.layout.columns) * promotion.gallery.layout.row;
    promotion.gallery.dirty = true; promotion.tick();
    check(!prefetched.signal.aborted, 'An in-flight near preview must be promoted when it becomes visible');
    check(promotion.jobs.filter(job => job.card.id === prefetched.card.id && !job.signal.aborted).length === 1, 'Promotion must not duplicate preparation');
    prefetched.complete(); await flush(); promotion.tick();
    check(promotion.uploads.some(upload => promotion.gallery.assigned.find(item => item.slot === upload.slot)?.id === prefetched.card.id), 'Promoted pixels must upload for their current visible owner');
    promotion.gallery.dispose();
    const burst = harness(4), fullPreview = { images: [new Uint8Array(2764800)], parameters: new Float32Array(176) };
    burst.gallery.reconcile();
    for (const item of burst.gallery.assigned) burst.cache.set(burst.cards.find(card => card.id === item.id), fullPreview);
    burst.gallery.uploadBudget = new GalleryUploadBudget(() => 0);
    burst.tick();
    check(burst.uploads.length === 3, 'A frame should upload three full-sized cached previews within the byte budget');
    check(burst.uploads.every(upload => burst.visible().includes(burst.gallery.assigned.find(item => item.slot === upload.slot).id)), 'Upload bursts must retain visible-first ordering');
    await flush(); burst.tick();
    check(burst.uploads.length === 6, 'Deferred cached previews must continue in the following frame');
    burst.gallery.dispose();

    const slow = harness(4); slow.gallery.reconcile();
    for (const item of slow.gallery.assigned) slow.cache.set(slow.cards.find(card => card.id === item.id), fullPreview);
    let uploadTime = 0;
    slow.gallery.uploadBudget = new GalleryUploadBudget(() => uploadTime);
    slow.gallery.graphics.upload = async slot => { slow.uploads.push({ slot }); uploadTime += 3; };
    slow.tick(); check(slow.uploads.length === 1, 'Slow synchronous uploads must yield after exceeding the time budget');
    await flush(); slow.tick(); check(slow.uploads.length === 2, 'A slow device must still make progress in every frame');
    slow.gallery.dispose();

    const replacement = harness(4); replacement.gallery.reconcile();
    for (const item of replacement.gallery.assigned) replacement.cache.set(replacement.cards.find(card => card.id === item.id), fullPreview);
    const uploadCompletions = [];
    replacement.gallery.uploadBudget = new GalleryUploadBudget(() => 0);
    replacement.gallery.graphics.upload = () => new Promise(resolve => uploadCompletions.push(resolve));
    replacement.tick(); check(uploadCompletions.length === 3, 'The ownership test must have multiple pending upload completions');
    const staleUploads = replacement.gallery.assigned.filter(item => replacement.gallery.entries.get(item.slot).uploading)
      .map(item => ({ ...item, entry: replacement.gallery.entries.get(item.slot) }));
    // Cross enough uncached viewports to exhaust retained residency as well as
    // leave the screen; retained offscreen slots legitimately remain reusable.
    for (let i = 0; i < 8; i++) {
      replacement.gallery.viewport.scrollTop += replacement.gallery.layout.row * 8;
      replacement.gallery.dirty = true; replacement.tick();
    }
    uploadCompletions.forEach(resolve => resolve()); await flush();
    const reassigned = staleUploads.filter(item => !replacement.gallery.residency.owns(item.slot, item.token));
    check(reassigned.length > 0 && reassigned.every(item => !item.entry.ready), 'Upload completions from a previous viewport must not report replacement slots ready');
    check(replacement.gallery.assigned.every(item => !replacement.gallery.entries.get(item.slot).ready), 'Replacement cards must wait for their own uploads');
    replacement.gallery.dispose();
    return { passed: ['visible priority', 'cache bypass', 'stale cancellation', 'hide cancellation', 'overscan preemption',
      'prefetch promotion', 'bounded upload burst', 'visible upload priority', 'upload time budget and progress', 'pending upload ownership'], concurrency: 4 };
  });
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
