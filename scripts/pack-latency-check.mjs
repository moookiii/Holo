import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const out = `artifacts/pack-latency-${process.env.PACK_LABEL ?? 'current'}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const reports = [];
try {
  for (const prepared of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(({ prepared }) => {
      const random = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = array => array instanceof Uint32Array && array.length === 1 ? (array[0] = 0x12345678, array) : random(array);
      if (!prepared) window.requestIdleCallback = () => 0;
    }, { prepared });
    await page.goto(process.env.HOLO_URL ?? 'http://127.0.0.1:5173/');
    await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 180000 });
    if (prepared) await page.waitForFunction(() => window.__holo.stats().preparedPack, null, { timeout: 180000 });
    const before = await page.evaluate(() => window.__holo.stats());
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
    const ready = await page.evaluate(() => ({ stats: window.__holo.stats(), pack: window.__holo.pack.stats(), probe: window.__packProbe }));
    const stages = [];
    for (const [stage, progress] of [['sealed', 0], ['tear', .5], ['open', .7], ['extract', .6], ['reveal', 0], ['reveal', 1], ['reveal', 2], ['reveal', 3], ['hit', .5]]) {
      await page.evaluate(([stage, progress]) => window.__holo.pack.setStage(stage, progress), [stage, progress]);
      await page.waitForTimeout(200);
      stages.push(await page.evaluate(() => ({ factory: window.__holo.factory.stats(), frameMs: window.__holo.stats().frameMs, calls: window.__holo.renderer.info.render.calls })));
      if (stage === 'reveal' || stage === 'sealed') await page.screenshot({ path: `${out}/${prepared ? 'prepared' : 'cold'}-${stage}-${progress}.png` });
    }
    reports.push({ prepared, before, ready, stages, errors });
    await writeFile(`${out}/report.json`, JSON.stringify(reports, null, 2));
    console.log(JSON.stringify({ prepared, metrics: ready.stats.packMetrics, probe: ready.probe, errors }));
    await page.close();
  }
} finally { await browser.close(); }
