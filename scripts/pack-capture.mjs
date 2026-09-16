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
  const stages = [
    ['intro-start', 'intro', 0], ['intro-half', 'intro', .5], ['sealed', 'sealed', 0], ['gripped', 'gripped', 0], ['tear-start', 'tear', .12], ['tear-half', 'tear', .5], ['tear-complete', 'tear', 1],
    ['wrapper-open', 'open', .7], ['cards-visible', 'open', 1], ['stack-half-extracted', 'extract', .5], ['stack-extracted', 'stack', 0],
    ['normal-card-reveal', 'reveal', 0], ['holo-card-first-visible', 'hit', 0], ['holo-card-light-sweep', 'hit', .5], ['final-holo-pose', 'hit', 1], ['summary', 'summary', 0],
  ];
  for (const [name, stage, value] of stages) {
    await page.evaluate(([stage, value]) => window.__holo.pack.setStage(stage, value), [stage, value]);
    await page.waitForTimeout(180); await page.screenshot({ path: join(out, `${name}.png`) });
    captures.push({ name, pack: await page.evaluate(() => window.__holo.pack.stats()), renderer: await page.evaluate(() => window.__holo.stats()) });
  }
  await page.evaluate(() => window.__holo.pack.select(2)); await page.waitForTimeout(100); await page.screenshot({ path: join(out, 'selected-summary-card.png') });
  if (process.env.PACK_DETAIL) {
    for (const [name, stage, value, angle] of [['wrapper-oblique', 'sealed', 0, .8], ['wrapper-edge', 'sealed', 0, 1.5], ['wrapper-back', 'sealed', 0, Math.PI], ['extraction-oblique', 'extract', .5, .65]]) {
      await page.evaluate(([stage, value, angle]) => {
        window.__holo.pack.setStage(stage, value);
        window.__holo.pack.pose(angle * 180 / Math.PI);
      }, [stage, value, angle]);
      await page.waitForTimeout(160); await page.screenshot({ path: join(out, `${name}.png`) });
    }
    await page.evaluate(() => { window.__holo.scene.getObjectByName('Pack opening').quaternion.identity(); window.__holo.pack.setStage('stack'); });
    for (const progress of [.25, .5, .75]) {
      await page.evaluate(p => window.__holo.pack.setRevealProgress(p), progress);
      await page.waitForTimeout(160); await page.screenshot({ path: join(out, `reveal-turn-${progress}.png`) });
    }
  }
  if (process.env.PACK_RESPONSIVE) for (const [name, width, height] of [['16-10', 1440, 900], ['16-9', 1600, 900], ['ultrawide', 2160, 900], ['tablet', 1024, 768], ['portrait', 390, 844], ['small', 320, 568], ['short-landscape', 844, 390]]) {
    await page.setViewportSize({ width, height });
    for (const [stage, value] of [['sealed', 0], ['extract', .5], ['hit', .5], ['summary', 0]]) {
      await page.evaluate(([stage, value]) => window.__holo.pack.setStage(stage, value), [stage, value]); await page.waitForTimeout(120);
      // ResizeObserver changes projection on the next frame; refit once it has run.
      await page.evaluate(([stage, value]) => window.__holo.pack.setStage(stage, value), [stage, value]); await page.waitForTimeout(100);
      await page.screenshot({ path: join(out, `${name}-${stage}.png`) });
    }
  }
  console.log(JSON.stringify({ preloadMs, errors, warnings, resources: await page.evaluate(() => window.__holo.factory.stats()), captures: captures.map(c => ({ name: c.name, triangles: c.renderer.triangles, frameMs: c.renderer.frameMs })) }, null, 2));
  await writeFile(join(out, 'report.json'), JSON.stringify({ preloadMs, errors, warnings, captures }, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) { await page.screenshot({ path: join(out, 'failure.png') }); console.error(JSON.stringify({ error: String(error), errors, warnings }, null, 2)); process.exitCode = 1; }
finally { await browser.close(); }
