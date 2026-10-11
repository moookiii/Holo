import { chromium, firefox } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';
import assert from 'node:assert/strict';

const url = process.env.GALLERY_URL || 'http://127.0.0.1:5173';
const out = process.env.ETCH_OUTPUT || 'artifacts/gallery-etch';
await mkdir(out, { recursive: true });
const source = execFileSync('git', ['show', `${process.env.ETCH_BASELINE || '7156bb4797f6046756d93e7a1704482040ab5643'}:src/card/CardPreviewPreparation.ts`], { encoding: 'utf8' });
const { code } = await transformWithOxc(source, 'baseline.ts');
const baseline = code.replace(/from (["'])(\.[^"']+)\1/g, (_match, quote, path) =>
  `from ${quote}${new URL(path.endsWith('.ts') ? path : `${path}.ts`, 'http://local/src/card/').pathname}${quote}`)
  .replaceAll('import.meta.env.BASE_URL', JSON.stringify('/'));
const name = process.env.ETCH_ENGINE || 'chromium';
const engine = name === 'firefox' ? firefox : chromium;
const browser = await engine.launch({ headless: true, executablePath: process.env.ETCH_BROWSER,
  ...(name === 'chromium' ? { args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] } : {}) });
const report = { errors: [] };
report.timingNote = 'Sequential preview timings have different cache states and are not a loading-speed benchmark.';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  // Other local tasks can edit assets while this capture runs. Ignore Vite HMR
  // in this test page so a reload cannot mix two render states in one capture.
  await page.addInitScript(() => {
    window.WebSocket = class extends EventTarget { static OPEN = 1; readyState = 0; send() {} close() {} };
  });
  page.on('pageerror', error => report.errors.push(String(error)));
  await page.route(`${url}/etch-harness`, route => route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
  await page.route('**/src/card/CardPreviewPreparation.ts?etch-baseline', route => route.fulfill({ contentType: 'text/javascript', body: baseline }));
  await page.goto(`${url}/etch-harness`);
  report.previews = await page.evaluate(async () => {
    const old = await import('/src/card/CardPreviewPreparation.ts?etch-baseline');
    const current = await import('/src/card/CardPreviewPreparation.ts');
    const { prismaticDefinition } = await import('/src/pokemon/PrismaticSurfaces.ts');
    const { galleryBatchKey, galleryPreviewOpticalLayers } = await import('/src/gallery/GalleryBatch.ts');
    const results = [];
    const hash = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).join(',');
    for (const [id, variant] of [['sv08.5-155', 'holo'], ['sv08.5-156', 'holo'], ['sv08.5-001', 'normal']]) {
      const card = prismaticDefinition(id, variant);
      const field = async () => { throw new Error('Plain cards must not generate procedural fields'); };
      const started = performance.now();
      const before = await old.prepareCardPreview(card, new AbortController().signal, field);
      const baselineMs = performance.now() - started, afterStart = performance.now();
      const after = await current.prepareCardPreview(card, new AbortController().signal, field);
      const currentMs = performance.now() - afterStart;
      const changed = [];
      for (let i = 0; i < before.images.length; i++) if (await hash(before.images[i]) !== await hash(after.images[i])) changed.push(i);
      const dimensionsMatch = after.images.every((image, i) => image.length === current.PREVIEW_ARRAY_SIZES[i][0] * current.PREVIEW_ARRAY_SIZES[i][1] * 4);
      results.push({ id, variant, sharp: after.parameters[137] < 0, packed: after.parameters[137] === -2, changed, dimensionsMatch,
        beforeBytes: before.images.reduce((n, image) => n + image.length, before.parameters.byteLength),
        afterBytes: after.images.reduce((n, image) => n + image.length, after.parameters.byteLength),
        sameBatch: galleryBatchKey(galleryPreviewOpticalLayers(before.parameters, before.images)) === galleryBatchKey(galleryPreviewOpticalLayers(after.parameters, after.images)),
        baselineMs, currentMs });
    }
    return results;
  });
  for (const result of report.previews) {
    assert.equal(result.dimensionsMatch, true);
    assert.equal(result.beforeBytes, result.afterBytes);
    assert.equal(result.sameBatch, result.variant === 'normal');
    assert.equal(result.sharp, result.variant === 'holo');
    assert.equal(result.packed, result.variant === 'holo');
    assert.deepEqual(result.changed, result.variant === 'holo' ? [2, 3, 6] : []);
  }
  const appUrl = new URL(url);
  appUrl.searchParams.set('backend', process.env.ETCH_BACKEND || (name === 'firefox' ? 'webgl' : 'webgpu'));
  await page.goto(appUrl.href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  await page.evaluate(() => window.__holo.gallery.open());
  for (const number of ['155', '156']) {
  await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill(`Prismatic ${number}`);
  await page.waitForFunction(() => {
    const s = window.__holo.gallery.stats();
    return !window.__holo.gallery.instance().dirty && s.visible > 0 && s.visible === s.visibleExpected && s.visibleFailed === 0;
  }, null, { timeout: 120000 });
  for (const preset of ['Studio', 'Skim', 'Low key', 'Moving light']) {
    await page.evaluate(preset => { const lighting = window.__holo.lighting; lighting.setPreset(preset); lighting.playing = false; lighting.phase = .8; lighting.applied = ''; }, preset);
    await page.mouse.move(700, 400);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${number}-${preset.replaceAll(' ', '-')}.png` });
  }
  }
  report.gallery = await page.evaluate(() => window.__holo.gallery.stats());
  report.backend = await page.evaluate(() => window.__holo.stats().backend);
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
