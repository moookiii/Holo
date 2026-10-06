import { firefox, chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { transformWithOxc } from 'vite';
import assert from 'node:assert/strict';

const out = 'artifacts/favorites-binder';
await mkdir(out, { recursive: true });
const browser = process.env.BINDER_BROWSER === 'chrome'
  ? await chromium.launch({ channel: 'chrome', headless: true })
  : await firefox.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 2560, height: 1392 } });
  let baselineRequests = 0;
  if (process.env.BINDER_BASELINE) {
    for (const [path, marker] of [
      ['src/materials/layers/StockSurfaceLayer.ts', 'const relief'],
      ...(process.env.BINDER_BASELINE === 'full' ? [['src/materials/HolographicMaterial.ts', 'const ancientMewSpectrum']] : []),
      ...(process.env.BINDER_BASELINE === 'async' ? [['src/rendering/StudioRenderer.ts', 'export async function createRenderer']] : []),
    ]) {
      const source = execFileSync('git', ['show', `${process.env.BINDER_BASELINE === 'async' ? '2aa774c8' : '05536377'}:${path}`], { encoding: 'utf8' });
      const transformed = (await transformWithOxc(source, path)).code;
      await page.route(`**/${path}*`, async route => {
        baselineRequests++;
        const response = await route.fetch(), current = await response.text();
        assert.ok(current.includes(marker) && transformed.includes(marker));
        // Retain Vite's resolved package/relative imports for the browser.
        const extra = path.endsWith('StudioRenderer.ts') ? 'import { eliminateShaderAliases } from "/src/rendering/ShaderAliases.ts";\n' : '';
        await route.fulfill({ response, body: extra + current.slice(0, current.indexOf(marker))
          + transformed.slice(transformed.indexOf(marker)) });
      });
    }
    if (process.env.BINDER_BASELINE === 'full') await page.route('**/src/rendering/ShaderAliases.ts*', async route => {
      baselineRequests++;
      await route.fulfill({ contentType: 'application/javascript', body: 'export function eliminateShaderAliases(code) { return code; } export function optimizeShaderBuilder() {}' });
    });

  }
  const errors = [];
  page.on('pageerror', error => { errors.push(String(error)); console.log('ERROR', String(error)); });
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.startsWith('[vite] failed to connect to websocket.') || text.startsWith('Failed to send error to Vite server:')) return;
    errors.push(text);
  });
  await page.routeWebSocket('**', socket => socket.close());
  await page.goto(`http://127.0.0.1:5173/?backend=${process.env.BINDER_BACKEND || 'webgl'}&benchmark-cold-viewer=1`);
  await page.waitForFunction(() => {
    const s = window.__holo?.gallery.stats();
    return s?.active && s.visibleExpected && s.visible === s.visibleExpected && !s.visibleFailed;
  }, null, { timeout: 180000 });
  await page.evaluate(() => {
    const g = window.__holo.gallery.instance(), events = [], start = performance.now();
    const choices = [
      ['Meowth', 'Wizards Black Star Promos', '10'], ['Pikachu', 'Base Set', '58'],
      ['Ancient Mew', 'Wizards Black Star Promos', ''], ['Typhlosion', 'Neo Genesis', '17'],
      ['Dark Porygon2', 'Neo Destiny', '8'], ['Light Dragonite', 'Neo Destiny', '14'],
      ['Jolteon ex', 'Prismatic Evolutions', '153'], ['Sylveon ex', 'Prismatic Evolutions', '156'],
    ];
    const cards = choices.map(([title, set, number]) => {
      const found = g.catalog.cards().filter(c => c.title === title && c.set === set && (!number || c.number.split('/')[0] === number));
      if (found.length !== 1) throw Error(`Ambiguous recorded card ${title}: ${JSON.stringify(found.map(c => [c.id, c.number]))}`);
      return found[0];
    });
    window.recordedLoad = { start, events, shaders: [], cards: cards.map(c => ({ id: c.id, profile: c.profile })), backend: window.__holo.stats().backend };
    const wrap = (object, key) => {
      const original = object[key];
      object[key] = async function(...args) {
        const at = performance.now();
        try { return await original.apply(this, args); }
        finally { events.push({ stage: key, at: at - start, ms: performance.now() - at,
          id: typeof args[0] === 'string' ? args[0] : args[0]?.id || args[0]?.definition?.id || args[0]?.name }); }
      };
    };
    for (const key of ['prepare', 'prepareMaps', 'prepareLayer']) wrap(g.options.cpu, key);
    for (const key of ['blob', 'image']) wrap(g.options.cpu.assets, key);
    const factory = g.options.binderFactory;
    g.options.binderFactory = () => {
      const f = factory();
      for (const key of ['realizeCardGpu', 'uploadCardResources', 'compile']) wrap(f, key);
      return f;
    };
    const backend = window.__holo.renderer.backend, create = backend.createRenderPipeline;
    wrap(window.__holo.renderer._nodes, 'getForRenderAsync');
    if (backend.gl) for (const key of ['compileShader', 'linkProgram', 'getProgramParameter', 'clientWaitSync']) {
      const original = backend.gl[key];
      backend.gl[key] = function(...args) {
        const at = performance.now();
        try { return original.apply(this, args); }
        finally { events.push({ stage: key, at: at - start, ms: performance.now() - at }); }
      };
    }
    window.recordedLoad.parallel = !!backend.parallel;
    backend.createRenderPipeline = function(object, promises) {
      window.recordedLoad.shaders.push({ material: object.material.name, vertex: object.pipeline.vertexProgram.code, fragment: object.pipeline.fragmentProgram.code });
      events.push({ stage: 'pipeline', at: performance.now() - start, material: object.material.name,
        vertexBytes: object.pipeline.vertexProgram.code.length, fragmentBytes: object.pipeline.fragmentProgram.code.length });
      return create.call(this, object, promises);
    };
    g.favorites.ids = new Set(cards.map(c => c.id));
    const click = performance.now(); g.openBinder();
    window.recordedLoad.click = click;
    let previousFrame = click;
    window.recordedLoad.openingFrameMax = 0;
    const poll = time => {
      window.recordedLoad.openingFrameMax = Math.max(window.recordedLoad.openingFrameMax, time - previousFrame);
      previousFrame = time;
      const s = g.stats();
      if (s.visible === s.visibleExpected && !s.visibleFailed) requestAnimationFrame(() => {
        window.recordedLoad.visibleMs = performance.now() - click;
        window.recordedLoad.stats = g.stats();
      });
      else requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });
  await page.waitForFunction(() => window.recordedLoad.visibleMs, null, { timeout: 240000 });
  if (!process.env.BINDER_BASELINE) {
    const variants = await page.evaluate(() => {
      const b = window.__holo.gallery.instance().binder;
      const m = [...b.physical.pages.values()].flatMap(p => [...p.cards.values()])
        .find(c => c.definition.id === 'pokemon:sv08.5-156:holo').mesh.material[0];
      const keys = [];
      for (const name of ['engraving', 'patternedSilver', 'sheen', 'inkTransmission', 'etchedInkSheen', 'fieldBlend']) {
        const original = m.optics[name].value, values = name === 'fieldBlend' ? [0, 1, .5] : [0, .5];
        const variants = values.map(value => { m.optics[name].value = value; return m.customProgramCacheKey(); });
        m.optics[name].value = original;
        keys.push({ name, distinct: new Set(variants).size, expected: values.length });
      }
      return keys;
    });
    for (const variant of variants) assert.equal(variant.distinct, variant.expected, `${variant.name} must invalidate inactive shader paths`);
  }
  const report = await page.evaluate(() => window.recordedLoad);
  report.frames = await page.evaluate(() => new Promise(resolve => {
    const durations = []; let previous = performance.now();
    const frame = time => {
      durations.push(time - previous); previous = time;
      if (durations.length < 90) requestAnimationFrame(frame);
      else { durations.sort((a, b) => a - b); resolve({ median: durations[45], p95: durations[85], max: durations[89] }); }
    };
    requestAnimationFrame(frame);
  }));
  if (process.env.BINDER_BASELINE) assert.ok(baselineRequests >= ({ full: 3, async: 2 }[process.env.BINDER_BASELINE] || 1));
  assert.equal(report.stats.visibleFailed, 0);
  assert.equal(report.stats.visible, 8);
  assert.deepEqual(errors, [], 'No shader compile or render errors');
  await writeFile(`${out}/recorded-${process.env.BINDER_LABEL || 'baseline'}.json`, JSON.stringify(report, null, 2));
  await page.screenshot({ path: `${out}/recorded-${process.env.BINDER_LABEL || 'baseline'}.png` });
  if (process.env.BINDER_VISUAL === '1') {
    for (const preset of ['Studio', 'Skim', 'Low key']) {
      await page.evaluate(preset => {
        const b = window.__holo.gallery.instance().binder;
        b.restoreLighting(); b.options.lighting.playing = false; b.options.lighting.setPreset(preset);
      }, preset);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const path = `${out}/recorded-${process.env.BINDER_BASELINE ? 'reference' : 'current'}-${preset.replace(' ', '-')}.png`;
      await page.screenshot({ path });
      if (!process.env.BINDER_BASELINE) {
        const reference = await readFile(path.replace('current', 'reference'));
        const current = await readFile(path);
        const comparison = await page.evaluate(async ({ reference, current }) => {
          const decode = async data => {
            const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
            const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
            const context = canvas.getContext('2d'); context.drawImage(img, 0, 0);
            return context.getImageData(0, 0, img.width, img.height).data;
          };
          const a = await decode(reference), b = await decode(current); let changed = 0, total = 0, max = 0;
          // The shell is also being edited in another task. Compare the eight
          // full card bounds so those unrelated geometry changes cannot mask
          // or falsely report a material regression.
          const binder = window.__holo.gallery.instance().binder;
          let channels = 0;
          for (const button of binder.buttons.values()) {
            const r = button.getBoundingClientRect();
            for (let y = Math.ceil(r.top) + 3; y < Math.floor(r.bottom) - 3; y++)
              for (let x = Math.ceil(r.left) + 3; x < Math.floor(r.right) - 3; x++)
                for (let c = 0; c < 3; c++) {
                  const i = (y * 2560 + x) * 4 + c, difference = Math.abs(a[i] - b[i]);
                  channels++; total += difference; max = Math.max(max, difference); if (difference) changed++;
                }
          }
          return { changed, max, mean: total / channels, comparedChannels: channels };
        }, { reference: reference.toString('base64'), current: current.toString('base64') });
        console.log(JSON.stringify({ preset, comparison }));
        assert.ok(comparison.mean < .02 && comparison.max <= 2, 'Shader optimization must preserve the rendered material');
      }
    }
  }
  console.log(JSON.stringify({ visibleMs: report.visibleMs, openingFrameMax: report.openingFrameMax, frames: report.frames, backend: report.backend, parallel: report.parallel, cards: report.cards }));
} finally { await browser.close(); }
