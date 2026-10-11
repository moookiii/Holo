import { chromium, firefox } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';

const base = process.env.GALLERY_URL || 'http://127.0.0.1:5173';
const ref = process.env.ETCH_BASELINE || '15122ee98';
const backend = process.env.ETCH_BACKEND || 'webgpu';
const out = 'artifacts/gallery-etch-compare';
await mkdir(out, { recursive: true });
const served = await fetch(`${base}/src/gallery/GalleryMaterial.ts`).then(response => response.text());
const dependencies = Object.fromEntries(['three/webgpu', 'three/tsl'].map(name => {
  const filename = name.replace('/', '_');
  const match = served.match(new RegExp(`from ["']([^"']*${filename}\\.js[^"']*)["']`));
  if (!match) throw new Error(`Missing served dependency ${name}`);
  return [name, match[1]];
}));
const snapshots = new Map();
for (const file of ['src/card/CardPreviewPreparation.ts', 'src/card/PreviewOptics.ts', 'src/gallery/GalleryMaterial.ts']) {
  const source = execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8' });
  const { code } = await transformWithOxc(source, file);
  const transformed = code.replace(/from (["'])([^"']+)\1/g, (_match, quote, name) => {
    const path = dependencies[name] || (name.startsWith('.') ? new URL(name.endsWith('.ts') ? name : `${name}.ts`, `${base}/${file}`).pathname : name);
    return `from ${quote}${path}${quote}`;
  }).replaceAll('import.meta.env.BASE_URL', JSON.stringify('/'));
  snapshots.set(`/${file}`, transformed);
}
const name = process.env.ETCH_ENGINE || 'chromium';
const engine = name === 'firefox' ? firefox : chromium;
const browser = await engine.launch({ headless: true, executablePath: process.env.ETCH_BROWSER,
  ...(name === 'chromium' ? { args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] } : {}) });
const report = { baseline: ref, engine: name, requestedBackend: backend, samples: [], errors: [], timingNote: 'Fresh contexts; local sources. Browser/driver shader caches and system load can vary.' };
try {
  for (const version of ['baseline', 'current', 'current', 'baseline']) {
    const run = report.samples.length;
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
    if (version === 'baseline') for (const [path, code] of snapshots)
      await context.route(`**${path}*`, route => route.fulfill({ contentType: 'text/javascript', body: code }));
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ version, message: String(error) }));
    await page.addInitScript(() => {
      window.WebSocket = class extends EventTarget { static OPEN = 1; readyState = 0; send() {} close() {} };
      window.__etchPipelines = [];
      let debug;
      Object.defineProperty(window, '__holo', { configurable: true, get: () => debug, set(value) {
        debug = value;
        const backend = value.renderer.backend, create = backend.createRenderPipeline;
        backend.createRenderPipeline = function(object, promises) {
          const start = performance.now(), result = create.call(this, object, promises);
          if (object.object.name.startsWith('Gallery optics')) window.__etchPipelines.push({
            name: object.object.name, blockingMs: performance.now() - start,
            bytes: object.pipeline.fragmentProgram.code.length });
          return result;
        };
      } });
    });
    await page.goto(`${base}/?backend=${backend}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
    await page.evaluate(() => window.__holo.gallery.open());
    const started = Date.now();
    await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill('Prismatic special illustration');
    await page.waitForFunction(() => {
      const gallery = window.__holo?.gallery.instance(), s = gallery?.stats();
      return gallery && !gallery.dirty && s.visible > 0 && s.visible === s.visibleExpected && s.visibleFailed === 0 && !s.pending;
    }, null, { timeout: 120000 });
    const readyMs = Date.now() - started;
    await page.waitForTimeout(500);
    const stats = await page.evaluate(() => ({ gallery: window.__holo.gallery.stats(), backend: window.__holo.stats().backend, pipelines: window.__etchPipelines }));
    // Record steady animation intervals after preparation/compilation complete.
    const cadence = await page.evaluate(() => new Promise(resolve => {
      const intervals = []; let previous;
      function frame(now) {
        if (previous !== undefined) intervals.push(now - previous);
        previous = now;
        if (intervals.length < 90) requestAnimationFrame(frame);
        else { intervals.sort((a, b) => a - b); resolve({ median: intervals[45], p95: intervals[85] }); }
      }
      requestAnimationFrame(frame);
    }));
    report.samples.push({ version, run, readyMs, ...stats, cadence });
    console.log(JSON.stringify({ version, run, readyMs, cadence, visible: stats.gallery.visible }));
    if (run < 2) for (const number of ['155', '156']) {
      await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill(`Prismatic ${number}`);
      await page.waitForFunction(() => {
        const gallery = window.__holo.gallery.instance(), s = gallery.stats();
        return !gallery.dirty && s.visible === 1 && s.visibleExpected === 1 && !s.pending;
      }, null, { timeout: 120000 });
      for (const preset of ['Studio', 'Skim', 'Low key', 'Moving light']) {
        await page.evaluate(preset => {
          const holo = window.__holo, light = holo.lighting;
          light.setPreset(preset); light.playing = false; light.phase = .8; light.applied = '';
          holo.gallery.instance().refreshLighting();
        }, preset);
        for (const tilt of [0, 100]) {
          const box = await page.locator('.gallery-card.is-ready').first().boundingBox();
          await page.mouse.move(tilt ? box.x + box.width / 2 + tilt : 1400, tilt ? box.y + box.height / 2 : 1000);
          await page.waitForTimeout(500);
          await page.locator('.gallery-card.is-ready').first().screenshot({ path: `${out}/${name}-${version}-${number}-${preset.replaceAll(' ', '-')}-${tilt}.png` });
        }
      }
    }
    await context.close();
  }
  if (report.errors.length) throw new Error(JSON.stringify(report.errors));
} finally {
  await writeFile(`${out}/${name}-report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
