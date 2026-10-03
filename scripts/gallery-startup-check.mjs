import { chromium, firefox } from 'playwright';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const name = process.env.GALLERY_BROWSER || 'chromium';
const engine = name === 'firefox' ? firefox : chromium;
const backend = process.env.GALLERY_BACKEND || 'webgl';
const out = join(process.cwd(), 'artifacts', `gallery-startup-${name}-${backend}`);
await mkdir(out, { recursive: true });
const options = { headless: true, ...(name === 'chromium' ? { args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] } : {}) };
if (!existsSync(engine.executablePath())) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => n.startsWith(`${name}-`)).sort().reverse()) {
    const path = join(base, version, ...(name === 'firefox' ? ['firefox', 'firefox.exe'] : ['chrome-win64', 'chrome.exe']));
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const browser = await engine.launch(options);
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
const report = { errors: [], samples: [] };
page.on('pageerror', error => report.errors.push(String(error)));
await page.addInitScript(() => {
  let debug;
  window.__galleryPipelines = [];
  Object.defineProperty(window, '__holo', { configurable: true, get: () => debug, set(holo) {
    debug = holo;
    const backend = holo.renderer.backend, create = backend.createRenderPipeline;
    backend.createRenderPipeline = function(object, promises) {
      const start = performance.now(), result = create.call(this, object, promises);
      if (object.object.name.startsWith('Gallery optics')) window.__galleryPipelines.push({
        batch: object.object.name, blockingMs: performance.now() - start,
        bytes: object.pipeline.fragmentProgram.code.length, asynchronous: Array.isArray(promises),
      });
      return result;
    };
  } });
});

async function painted(label) {
  await page.waitForFunction(() => {
    const gallery = window.__holo?.gallery.instance();
    return gallery?.openingReady && !gallery.stats().pending && document.querySelector('#loading').hidden;
  }, null, { timeout: 120000 });
  await page.waitForTimeout(300);
  const screenshot = await page.screenshot({ path: join(out, `${label}.png`) });
  const samples = await page.evaluate(async encoded => {
    const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    return [...document.querySelectorAll('.gallery-card')].flatMap(card => {
      const rect = card.getBoundingClientRect(), height = parseFloat(card.style.getPropertyValue('--card-height'));
      if (rect.top < 240 || rect.top + height > image.height) return [];
      const pixels = ctx.getImageData(Math.round(rect.left + rect.width * .2), Math.round(rect.top + height * .6),
        Math.round(rect.width * .6), Math.round(height * .25)).data;
      let lit = 0;
      for (let i = 0; i < pixels.length; i += 4) if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 35) lit++;
      return [{ card: card.getAttribute('aria-label'), ready: card.classList.contains('is-ready'), painted: lit / (pixels.length / 4) }];
    });
  }, screenshot.toString('base64'));
  report.samples.push({ label, samples });
  assert.ok(samples.length > 0, `${label}: expected visible cards`);
  assert.ok(samples.every(sample => sample.ready && sample.painted > .25), `${label}: missing card artwork: ${JSON.stringify(samples)}`);
  assert.equal(await page.evaluate(() => window.__holo.gallery.stats().failed), 0, `${label}: failed preview requests`);
  return samples;
}

try {
  const start = Date.now();
  await page.goto(`http://127.0.0.1:5173/?backend=${backend}`, { waitUntil: 'domcontentloaded' });
  const startup = await painted('startup');
  report.startupMs = Date.now() - start;
  assert.ok(startup.length >= 12);
  assert.match(startup[2].card, /Chansey/, 'Third card must paint without any click');
  report.startupPipelines = await page.evaluate(() => window.__galleryPipelines.slice());
  assert.ok(report.startupPipelines.every(pipeline => pipeline.asynchronous), 'Prepare shaders before presenting their batch');
  assert.ok(report.startupPipelines.every(pipeline => pipeline.bytes < 250000), 'Regular cards should not compile all Secret Rare kernels');
  const normalPipelines = report.startupPipelines.length;

  await page.getByRole('combobox', { name: 'Game', exact: true }).selectOption('Yu-Gi-Oh!');
  const lob = await page.getByRole('combobox', { name: 'Set', exact: true }).locator('option').evaluateAll(options =>
    options.find(option => option.textContent.includes('Legend of Blue Eyes'))?.value);
  assert.ok(lob, 'LOB catalog should be available');
  await page.getByRole('combobox', { name: 'Set', exact: true }).selectOption(lob);
  await page.getByRole('combobox', { name: 'Finish', exact: true }).selectOption('ygo-secret-early-tcg');
  await painted('secret');
  await page.mouse.move(620, 500);
  await page.waitForTimeout(600);
  await painted('secret-tilted');
  const pipelinesAfterSecret = await page.evaluate(() => window.__galleryPipelines.length);
  assert.ok(pipelinesAfterSecret > normalPipelines, 'Secret optics get their own shader');

  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.mouse.move(5, 5);
  await painted('return');
  await page.evaluate(async () => { await window.__holo.gallery.close(); await window.__holo.gallery.open(); });
  await painted('reopen');
  assert.equal(await page.evaluate(() => window.__galleryPipelines.length), pipelinesAfterSecret, 'Reuse prepared batches when returning to the gallery');
  report.pipelines = await page.evaluate(() => window.__galleryPipelines);
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report));
} catch (error) {
  report.failure = String(error); process.exitCode = 1; console.error(error);
  await page.screenshot({ path: join(out, 'failure.png') });
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
