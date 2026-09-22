import { firefox } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const out = `artifacts/firefox-loading-${process.env.LOAD_LABEL ?? 'current'}`;
await mkdir(out, { recursive: true });
const browser = await firefox.launch({ headless: true });
const report = { runs: [], errors: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    const random = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = array => array instanceof Uint32Array && array.length === 1 ? (array[0] = 94, array) : random(array);
    // Control when CPU preparation starts, so rotation covers its entire lifetime.
    window.requestIdleCallback = callback => { window.__prepare = callback; return 1; };
    window.cancelIdleCallback = () => { window.__prepare = undefined; };
  });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  for (const cache of ['cold', 'warm']) {
    await page.goto(process.env.HOLO_URL ?? 'http://127.0.0.1:4173/Holo/');
    await page.waitForFunction(() => window.__holo?.startupTiming.firstCardInteractive !== undefined, null, { timeout: 180000 });
    const run = { cache, startup: await page.evaluate(() => window.__holo.startupTiming) };
    console.log(JSON.stringify(run));
    await page.screenshot({ path: `${out}/${cache}-viewer.png` });
    await page.evaluate(() => {
      const h = window.__holo, backend = h.renderer.backend;
      const probe = window.__probe = { pipelines: [], uploads: [], builds: [] };
      const pipeline = backend.createRenderPipeline.bind(backend), upload = backend.updateTexture.bind(backend);
      backend.createRenderPipeline = (object, ...args) => {
        probe.pipelines.push({ mesh: object.object.name, material: object.material.constructor.name });
        return pipeline(object, ...args);
      };
      backend.updateTexture = (texture, ...args) => {
        probe.uploads.push({ width: texture.image?.width, height: texture.image?.height });
        return upload(texture, ...args);
      };
      const nodes = h.renderer._nodes, build = nodes.getForRenderAsync.bind(nodes);
      nodes.getForRenderAsync = async object => {
        const start = performance.now();
        try { return await build(object); }
        finally { probe.builds.push({ mesh: object.object.name, material: object.material.constructor.name, ms: performance.now() - start }); }
      };
      window.__frames = async (count, rotate = false) => {
        const samples = []; let previous = performance.now();
        for (let i = 0; i < count; i++) {
          const now = await new Promise(requestAnimationFrame);
          samples.push(now - previous); previous = now;
          if (rotate) h.pose(Math.sin(i / 25) * 35, Math.cos(i / 31) * 20);
        }
        samples.sort((a, b) => a - b);
        return { mean: samples.reduce((a, b) => a + b, 0) / count, p95: samples[Math.floor(count * .95)], max: samples.at(-1) };
      };
    });
    run.packs = [];
    for (const mode of ['cold', 'prepared', 'repeat']) {
      if (mode !== 'cold') {
        await page.evaluate(() => { window.__holo.pack.close(); window.__prepare?.(); });
        const before = await page.evaluate(() => structuredClone(window.__probe));
        const frames = await page.evaluate(() => window.__frames(240, true));
        await page.waitForFunction(() => !!window.__holo.stats().preparedPack, null, { timeout: 60000 });
        const after = await page.evaluate(() => structuredClone(window.__probe));
        run[`${mode}Background`] = { frames, newPipelines: after.pipelines.length - before.pipelines.length, newUploads: after.uploads.length - before.uploads.length };
      }
      await page.evaluate(() => window.__holo.pack.open());
      await page.waitForFunction(() => window.__holo.pack.stats().state === 'PackReady', null, { timeout: 30000 });
      const pack = await page.evaluate(() => ({ metrics: window.__holo.stats().packMetrics, factory: window.__holo.factory.stats(), probe: structuredClone(window.__probe) }));
      pack.mode = mode;
      pack.stages = [];
      for (const [stage, progress] of [['sealed', 0], ['tear', .5], ['open', 1], ['extract', .6], ['reveal', 0], ['reveal', 1], ['reveal', 2], ['reveal', 3], ['hit', .5], ['summary', 0]]) {
        await page.evaluate(([s, p]) => window.__holo.pack.setStage(s, p), [stage, progress]);
        pack.stages.push({ stage, frames: await page.evaluate(() => window.__frames(20)) });
        if (mode === 'cold' && ['sealed', 'tear', 'hit', 'summary'].includes(stage)) await page.screenshot({ path: `${out}/${cache}-${stage}.png` });
      }
      pack.after = await page.evaluate(() => structuredClone(window.__probe));
      if (process.env.LOAD_VERIFY) {
        assert.equal(pack.after.pipelines.length, pack.probe.pipelines.length, 'no reveal pipelines');
        const large = p => p.uploads.filter(t => t.width * t.height > 1024).length;
        assert.equal(large(pack.after), large(pack.probe), 'no large reveal uploads');
        assert.equal(pack.metrics.holoMaterials, 1); assert.equal(pack.metrics.printMaterials, 4);
      }
      run.packs.push(pack);
      console.log(JSON.stringify({ cache, mode, metrics: pack.metrics }));
    }
    report.runs.push(run);
    await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  }
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
