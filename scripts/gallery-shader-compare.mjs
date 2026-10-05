import { firefox } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const url = process.env.GALLERY_URL || 'http://127.0.0.1:5174/';
const out = join(process.cwd(), 'artifacts', 'gallery-shader-compare');
await mkdir(out, { recursive: true });
const baseline = await readFile('artifacts/gallery-material-before-optimization.js', 'utf8');
const browser = await firefox.launch({ headless: true, executablePath: join(process.env.LOCALAPPDATA, 'ms-playwright', 'firefox-1543', 'firefox', 'firefox.exe') });
const report = [];
try {
  for (const version of ['baseline', 'optimized']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    if (version === 'baseline') {
      await page.route('**/src/gallery/GalleryMaterial.ts*', route => route.fulfill({ contentType: 'text/javascript', body: baseline }));
      if (process.env.GALLERY_COMPARE_RENDERER) {
        const renderer = await readFile(process.env.GALLERY_COMPARE_RENDERER, 'utf8');
        await page.route('**/src/gallery/GalleryRenderer.ts*', route => route.fulfill({ contentType: 'text/javascript', body: renderer }));
      }
    }
    await page.addInitScript(() => {
      window.__shaderCapture = []; let debug;
      Object.defineProperty(window, '__holo', { configurable: true, get: () => debug, set(value) {
        debug = value; const backend = value.renderer.backend, create = backend.createRenderPipeline;
        backend.createRenderPipeline = function(object, promises) {
          const started = performance.now(), result = create.call(this, object, promises);
          if (object.object.name.startsWith('Gallery ')) window.__shaderCapture.push({ name: object.object.name,
            ms: performance.now() - started, code: object.pipeline.fragmentProgram.code, vertex: object.pipeline.vertexProgram.code });
          return result;
        };
      } });
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    for (const [fixture, search] of [['base', ''], ['sylveon', 'Sylveon'], ['secret', 'Blue-Eyes White Dragon']]) {
      if (search) await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill(search);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.waitForFunction(() => {
        const g = window.__holo?.gallery.instance();
        return g?.active && !g.dirty && !g.stats().pending && !g.stats().failed && [...g.entries.values()].every(e => e.ready) && document.querySelector('#loading').hidden;
      }, null, { timeout: 120000 });
      for (const lighting of ['Studio', 'Skim', 'Low key', 'Blacklight']) {
        await page.evaluate(preset => { const l = window.__holo.lighting; l.setPreset(preset); l.playing = false; l.phase = .8; l.applied = ''; }, lighting);
        await page.mouse.move(5, 5); await page.waitForTimeout(150);
        await page.screenshot({ path: join(out, `${version}-${fixture}-${lighting.replaceAll(' ', '-')}.png`) });
      }
      console.log(version, fixture, 'captured');
    }
    const shaders = await page.evaluate(() => window.__shaderCapture);
    for (const [index, shader] of shaders.entries()) {
      await writeFile(join(out, `${version}-${index}.glsl`), shader.code);
      await writeFile(join(out, `${version}-${index}.vert.glsl`), shader.vertex);
      report.push({ version, index, name: shader.name, ms: shader.ms, bytes: shader.code.length });
    }
    await context.close();
  }
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
