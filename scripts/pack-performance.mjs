import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) for (const version of (await readdir(base)).filter(v => /^chromium-\d+$/.test(v)).sort().reverse()) {
  const candidate = join(base, version, 'chrome-win64', 'chrome.exe');
  if (existsSync(candidate)) { executablePath = candidate; break; }
}
const out = join(process.cwd(), 'artifacts', process.env.PACK_CAPTURE || 'pack-pass-01'); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [], warnings = [], captures = [];
let preloadMs = 0;
page.on('pageerror', error => errors.push(error.stack));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); if (message.type() === 'warning') warnings.push(message.text()); });
try {
  await page.goto(`http://127.0.0.1:5173/?backend=${process.env.PACK_BACKEND || 'webgpu'}`);
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  const preloadStart = Date.now();
  await page.evaluate(async () => { window.__holo.pack.setSeed(1741); await window.__holo.pack.open('test-pack'); });
  preloadMs = Date.now() - preloadStart;
  for (const stage of ['tear', 'open']) {
    const result = await page.evaluate(async stage => {
      const costs = [], frames = []; let last = performance.now();
      for (let i = 0; i < 120; i++) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        const now = performance.now(); if (i > 8) frames.push(now - last); last = now;
        const start = performance.now(); window.__holo.pack.setStage(stage, i / 119);
        costs.push(performance.now() - start);
      }
      const percentile = (data, q) => data.sort((a,b) => a-b)[Math.floor((data.length-1)*q)];
      return { stage, updateMedian: percentile(costs, .5), updateP95: percentile(costs, .95), frameMedian: percentile(frames, .5), frameP95: percentile(frames, .95) };
    }, stage);
    captures.push(result);
  }
  console.log(JSON.stringify({ preloadMs, errors, warnings, resources: await page.evaluate(() => window.__holo.factory.stats()), captures }, null, 2));
  await writeFile(join(out, 'report.json'), JSON.stringify({ preloadMs, errors, warnings, captures }, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) { await page.screenshot({ path: join(out, 'failure.png') }); console.error(JSON.stringify({ error: String(error), errors, warnings }, null, 2)); process.exitCode = 1; }
finally { await browser.close(); }
