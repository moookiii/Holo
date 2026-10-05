import { chromium, firefox } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const engine = process.env.HOLO_BROWSER === 'firefox' ? firefox : chromium;
const name = engine.name(), out = join(process.cwd(), 'artifacts', 'ancient-mew-gallery', process.env.REVIEW_SUFFIX || name);
await mkdir(out, { recursive: true });
let executablePath = engine.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(root)).filter(folder => new RegExp(`^${name}-\\d+$`).test(folder)).sort().reverse()) {
    const candidate = name === 'firefox' ? join(root, version, 'firefox', 'firefox.exe') : join(root, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await engine.launch({ executablePath, headless: true, ...(name === 'chromium' ? { args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /shader|program|WebGL|THREE|TSL/i.test(message.text())) errors.push(message.text()); });
  await page.addInitScript(() => {
    let debug;
    window.mewGalleryBench = { previews: [], compilations: [], pipelines: [] };
    Object.defineProperty(window, '__holo', { configurable: true, get: () => debug, set(h) {
      debug = h;
      const prepare = h.cpuPreparation.preparePreview;
      h.cpuPreparation.preparePreview = async function(card, signal) {
        const row = { id: card.id, started: performance.now() }; window.mewGalleryBench.previews.push(row);
        try { return await prepare.call(this, card, signal); }
        finally { row.ms = performance.now() - row.started; }
      };
      const compile = h.factory.compile;
      h.factory.compile = async function(mesh) {
        const row = { name: mesh.name, started: performance.now() }; window.mewGalleryBench.compilations.push(row);
        try { return await compile.call(this, mesh); }
        finally { row.ms = performance.now() - row.started; }
      };
      const backend = h.renderer.backend, create = backend.createRenderPipeline;
      backend.createRenderPipeline = function(object, promises) {
        const row = { name: object.object.name, started: performance.now(), fragment: object.pipeline.fragmentProgram.code };
        window.mewGalleryBench.pipelines.push(row);
        const start = promises?.length ?? 0;
        const result = create.call(this, object, promises);
        row.syncMs = performance.now() - row.started;
        if (promises) void Promise.all(promises.slice(start)).then(() => { row.ms = performance.now() - row.started; });
        return result;
      };
    } });
  });
  const ready = async () => {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForFunction(() => {
      const g = window.__holo?.gallery.stats();
      return g?.active && g.visibleExpected > 0 && g.visible === g.visibleExpected && g.visibleFailed === 0;
    }, null, { timeout: 120000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  };
  await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(() => window.__holo?.gallery.stats()?.active, null, { timeout: 120000 });
  await ready();
  await page.getByRole('combobox', { name: 'Set', exact: true }).selectOption({ label: 'Wizards Black Star Promos' });
  await ready();
  const timings = [];
  for (const pass of ['first', 'return']) {
    const state = await page.evaluate(() => {
      window.mewTileStarted = performance.now();
      const input = document.querySelector('[aria-label="Search gallery cards"]');
      input.value = 'Ancient Mew'; input.dispatchEvent(new Event('input', { bubbles: true }));
      return { compilations: window.mewGalleryBench.compilations.length, previews: window.mewGalleryBench.previews.length };
    });
    await ready();
    timings.push(await page.evaluate(([pass, state]) => ({ pass, presentedMs: performance.now() - window.mewTileStarted,
      newCompilations: window.mewGalleryBench.compilations.slice(state.compilations),
      newPreviews: window.mewGalleryBench.previews.slice(state.previews), gallery: window.__holo.gallery.stats() }), [pass, state]));
    for (const [label, light, pitch, yaw] of [['front', 'Studio', 0, 0], ['tilt', 'Studio', .15, -.28], ['grazing', 'Strip', -.22, .4]]) {
      await page.evaluate(([light, pitch, yaw]) => {
        const h = window.__holo, g = h.gallery.instance();
        h.lighting.setPreset(light); h.lighting.playing = false;
        g.pointer = undefined; g.tilt.damping = 0;
        for (const entry of g.entries.values()) { entry.pitch = pitch; entry.yaw = yaw; }
      }, [light, pitch, yaw]);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: join(out, `${pass}-${label}.png`) });
    }
    await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill('Pikachu'); await ready();
  }
  const bench = await page.evaluate(() => window.mewGalleryBench);
  for (const [i, pipeline] of bench.pipelines.entries()) {
    await writeFile(join(out, `${i}.glsl`), pipeline.fragment);
    pipeline.fragmentBytes = pipeline.fragment.length; delete pipeline.fragment;
  }
  const report = { browser: name, version: browser.version(), timings, bench, errors };
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ browser: name, timings, errors }));
} finally { await browser.close(); }
