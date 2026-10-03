import { chromium } from 'playwright';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const label = process.argv[2] ?? 'after';
const backend = process.argv[3] ?? 'webgpu';
const out = `artifacts/spotlight-switch/${label}-${backend}`;
await mkdir(out, { recursive: true });
const opts = { headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] };
if (process.env.BROWSER_EXECUTABLE) opts.executablePath = process.env.BROWSER_EXECUTABLE;
else if (!existsSync(chromium.executablePath())) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const versions = (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse();
  for (const version of versions) {
    const path = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(path)) { opts.executablePath = path; break; }
  }
}
const browser = await chromium.launch(opts);
const page = await browser.newPage({ viewport: { width: 1000, height: 1100 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
try {
  await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  await page.evaluate(() => {
    const h = window.__holo; h.hideUI(); h.setMode('rotate'); h.pose(0,0);
    window.spotlightPipelines = [];
    const create = h.renderer.backend.createRenderPipeline;
    h.renderer.backend.createRenderPipeline = function(object, promises) {
      window.spotlightPipelines.push(object.material.name || object.material.type);
      return create.call(this, object, promises);
    };
  });
  const switches = [];
  for (const preset of ['Spotlight', 'Studio', 'Spotlight', 'Soft', 'Studio']) {
    switches.push(await page.evaluate(async preset => {
      const count = window.spotlightPipelines.length;
      const started = performance.now();
      const h = window.__holo; h.lighting.setPreset(preset);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { preset, elapsedMs: performance.now() - started, pipelines: window.spotlightPipelines.slice(count), spotIntensity: h.lighting.spot.intensity };
    }, preset));
    await page.screenshot({ path: `${out}/${switches.length}-${preset}.png` });
  }
  const report = { backend, switches, errors };
  await writeFile(`${out}/report.json`, JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  assert.deepEqual(errors, []);
  if(label !== 'before') {
    assert.ok(switches.every(s => s.pipelines.length === 0), 'Lighting switches must reuse the compiled card pipelines');
    assert.ok(switches.every(s => s.preset === 'Spotlight' ? s.spotIntensity > 0 : s.spotIntensity === 0), 'The spotlight must contribute only in its own mode');
  }
} finally { await browser.close(); }
