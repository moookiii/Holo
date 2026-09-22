import { chromium, firefox } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const out = `artifacts/pack-latency-${process.env.PACK_LABEL ?? 'current'}`;
await mkdir(out, { recursive: true });
const browser = process.env.PACK_BROWSER === 'firefox' ? await firefox.launch({ headless: true })
  : await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const reports = [];
try {
  for (const prepared of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') console.log(m.text()); });
    await page.addInitScript(({ prepared }) => {
      const random = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = array => array instanceof Uint32Array && array.length === 1 ? (array[0] = 94, array) : random(array);
      if (!prepared) window.requestIdleCallback = () => 0;
    }, { prepared });
    await page.goto(process.env.HOLO_URL ?? 'http://127.0.0.1:5173/');
    await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 180000 });
    await page.evaluate(() => {
      const backend = window.__holo.renderer.backend;
      const gpu = window.__gpuProbe = { pipelines: [], uploads: [], allocations: 0, nodeBuilds: [], pipelineMs: [] };
      const nodes = window.__holo.renderer._nodes, build = nodes.getForRenderAsync.bind(nodes);
      nodes.getForRenderAsync = async object => { const start = performance.now(); try { return await build(object); } finally { gpu.nodeBuilds.push({ mesh: object.object.name, material: object.material.constructor.name, ms: performance.now() - start }); } };
      const create = backend.createRenderPipeline.bind(backend), upload = backend.updateTexture.bind(backend), allocate = backend.createTexture.bind(backend);
      backend.createRenderPipeline = (object, ...args) => {
        gpu.pipelines.push({ material: object.material.constructor.name, mesh: object.object.name }); const start = performance.now();
        const result = create(object, ...args);
        void Promise.all(args[0] ?? []).then(() => gpu.pipelineMs.push({ mesh: object.object.name, ms: performance.now() - start })); return result;
      };
      backend.createTexture = (...args) => { gpu.allocations++; return allocate(...args); };
      backend.updateTexture = (texture, ...args) => { gpu.uploads.push({ width: texture.image?.width, height: texture.image?.height }); return upload(texture, ...args); };
      window.__sampleFrames = count => new Promise(resolve => {
        const intervals = []; let previous = performance.now();
        const frame = now => { intervals.push(now - previous); previous = now; if (intervals.length < count) requestAnimationFrame(frame); else {
          const sorted = [...intervals].sort((a, b) => a - b);
          resolve({ mean: intervals.reduce((a, b) => a + b, 0) / count, p95: sorted[Math.floor(count * .95)], max: sorted.at(-1) });
        } }; requestAnimationFrame(frame);
      });
    });
    if (prepared) await page.waitForFunction(() => window.__holo.stats().preparedPack, null, { timeout: 30000 }).catch(async error => { console.log(await page.evaluate(() => window.__holo.stats())); throw error; });
    const before = await page.evaluate(() => window.__holo.stats());
    const viewerFrames = await page.evaluate(() => window.__sampleFrames(180));
    const viewerGpu = await page.evaluate(() => structuredClone(window.__gpuProbe));
    await page.evaluate(async () => {
      const h = window.__holo, timings = window.__packProbe = {};
      const { PackWrapper } = await import('/src/pack/wrapper/PackWrapper.ts');
      const wrap = (object, method, label) => {
        const original = object[method].bind(object);
        object[method] = async (...args) => { const start = performance.now(); try { return await original(...args); } finally { (timings[label] ??= []).push(performance.now() - start); } };
      };
      wrap(PackWrapper, 'create', 'wrapperMs'); wrap(h.factory, 'compile', 'compileMs');
      wrap(h.factory, 'realizeCardGpu', 'realizeMs'); wrap(h.factory, 'create', 'coldCardMs');
      await h.pack.open();
    });
    const ready = await page.evaluate(() => ({ stats: window.__holo.stats(), pack: window.__holo.pack.stats(), probe: window.__packProbe, gpu: structuredClone(window.__gpuProbe) }));
    const stages = [];
    for (const [stage, progress] of [['sealed', 0], ['tear', .5], ['open', .7], ['extract', .6], ['reveal', 0], ['reveal', 1], ['reveal', 2], ['reveal', 3], ['hit', .5]]) {
      await page.evaluate(([stage, progress]) => window.__holo.pack.setStage(stage, progress), [stage, progress]);
      const frames = await page.evaluate(() => window.__sampleFrames(30));
      stages.push(await page.evaluate(({ frames, stage }) => ({ stage, frames, factory: window.__holo.factory.stats(), gpu: structuredClone(window.__gpuProbe), calls: window.__holo.renderer.info.render.calls }), { frames, stage }));
      if (stage === 'reveal' || stage === 'sealed') await page.screenshot({ path: `${out}/${prepared ? 'prepared' : 'cold'}-${stage}-${progress}.png` });
    }
    let repeat;
    if (prepared) {
      await page.evaluate(() => window.__holo.pack.close());
      await page.waitForFunction(() => window.__holo.stats().preparedPack, null, { timeout: 30000 });
      await page.evaluate(() => window.__holo.pack.open());
      repeat = await page.evaluate(() => window.__holo.stats().packMetrics);
    }
    reports.push({ prepared, before, viewerFrames, viewerGpu, ready, stages, repeat, errors });
    await writeFile(`${out}/report.json`, JSON.stringify(reports, null, 2));
    console.log(JSON.stringify({ prepared, metrics: ready.stats.packMetrics, probe: ready.probe, errors }));
    if (process.env.PACK_VERIFY) {
      assert.equal(ready.stats.packMetrics.holoMaterials, 1);
      assert.equal(ready.stats.packMetrics.printMaterials, 4);
      assert.equal(ready.stats.packMetrics.printPipelines, 1);
      assert.equal(viewerGpu.pipelines.length, 0, 'no background pipelines');
      assert.equal(viewerGpu.uploads.length, 0, 'no background uploads');
      assert.equal(stages.at(-1).gpu.pipelines.length, ready.gpu.pipelines.length, 'no first-use pipelines during animation');
      assert.equal(stages.at(-1).gpu.uploads.filter(t => t.width * t.height > 1024).length, ready.gpu.uploads.filter(t => t.width * t.height > 1024).length, 'no large reveal uploads');
      assert.deepEqual(errors, []);
    }
    await page.close();
  }
} finally { await browser.close(); }
