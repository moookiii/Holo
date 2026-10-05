import { firefox } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const url = process.env.GALLERY_URL || 'http://127.0.0.1:5174/';
const out = join(process.cwd(), 'artifacts', process.env.GALLERY_COMPARE_OUT || 'gallery-shader-compare');
await mkdir(out, { recursive: true });
const currentModule = await fetch(new URL('/src/gallery/GalleryMaterial.ts', url)).then(response => response.text());
const dependencyVersion = currentModule.match(/three_webgpu\.js\?v=([^"']+)/)?.[1];
const currentDependencies = code => dependencyVersion ? code.replace(/(\/node_modules\/\.vite\/deps\/[^"'?]+\?v=)[^"']+/g, '$1' + dependencyVersion) : code;
const baseline = currentDependencies(await readFile(process.env.GALLERY_COMPARE_BASELINE || 'artifacts/gallery-material-before-optimization.js', 'utf8'));
const browser = await firefox.launch({ headless: true, executablePath: join(process.env.LOCALAPPDATA, 'ms-playwright', 'firefox-1543', 'firefox', 'firefox.exe') });
const report = [];
try {
  for (const version of ['baseline', 'optimized']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    if (version === 'baseline') {
      await page.route('**/src/gallery/GalleryMaterial.ts*', route => route.fulfill({ contentType: 'text/javascript', body: baseline }));
      if (process.env.GALLERY_COMPARE_RENDERER) {
        const renderer = currentDependencies(await readFile(process.env.GALLERY_COMPARE_RENDERER, 'utf8'));
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
        return g?.active && !g.dirty && g.assigned.length && g.assigned.every(a => {
          const entry = g.entries.get(a.slot); return entry?.token === a.token && entry.ready && !entry.error && !entry.uploading;
        }) && document.querySelector('#loading').hidden;
      }, null, { timeout: 120000 });
      for (const lighting of ['Studio', 'Skim', 'Low key', 'Blacklight']) {
        await page.evaluate(preset => { const l = window.__holo.lighting; l.setPreset(preset); l.playing = false; l.phase = .8; l.applied = ''; }, lighting);
        await page.mouse.move(5, 5); await page.waitForTimeout(150);
        const capture = await page.screenshot({ path: join(out, `${version}-${fixture}-${lighting.replaceAll(' ', '-')}.png`) });
        const lit = await page.evaluate(async base64 => {
          const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
          const viewport = document.querySelector('.gallery-viewport').getBoundingClientRect();
          return [...document.querySelectorAll('.gallery-card.is-ready')].flatMap(card => {
            const r = card.getBoundingClientRect(), height = parseFloat(card.style.getPropertyValue('--card-height'));
            const top = Math.max(r.top, viewport.top), bottom = Math.min(r.top + height, viewport.bottom, image.height);
            if (bottom <= top) return [];
            const data = ctx.getImageData(Math.round(r.left + r.width * .2), Math.floor(top), Math.round(r.width * .6), Math.max(1, Math.floor(bottom)-Math.floor(top))).data;
            let count = 0; for (let i=0; i<data.length; i+=4) if (Math.max(data[i],data[i+1],data[i+2])>35) count++;
            return [count/(data.length/4)];
          });
        }, capture.toString('base64'));
        if (!lit.length || lit.some(fraction => fraction < .1)) throw new Error(`${version}/${fixture}/${lighting}: black or absent artwork`);
      }
      console.log(version, fixture, 'captured');
    }
    const shaders = await page.evaluate(() => window.__shaderCapture);
    if (errors.length) throw new Error(`${version}: ${errors.join('\n')}`);
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
