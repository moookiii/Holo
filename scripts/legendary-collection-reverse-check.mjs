import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const v of (await readdir(root)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const p = join(root, v, 'chrome-win64/chrome.exe');
    if (existsSync(p)) { executablePath = p; break; }
  }
}
const out = 'artifacts/lc-review'; await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
try {
  await page.goto('http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  if (!process.argv.includes('--gallery-only')) {
    for (const n of [34, 44, 57, 100, 102]) {
      await page.evaluate(async n => { await window.__holo.setCard(`pokemon:lc-${n}:reverse`); window.__holo.hideUI(); window.__holo.pose(0, 0); }, n);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${out}/viewer-${n}.png` });
      if (n === 34) {
        await page.evaluate(() => window.__holo.pose(-18, 12)); await page.waitForTimeout(350);
        await page.screenshot({ path: `${out}/viewer-${n}-tilt.png` });
      }
    }
  }
  await page.evaluate(() => window.__holo.gallery.open());
  await page.getByLabel('Set', { exact: true }).selectOption('Legendary Collection');
  await page.getByLabel('Finish', { exact: true }).selectOption('reverse');
  for (const name of ['Graveler', 'Pidgeotto', 'Omanyte']) {
    await page.getByLabel('Search gallery cards').fill(name);
    await page.waitForFunction(() => { const s = window.__holo.gallery.stats(); return s.filtered === 1 && s.visible === 1 && s.pending === 0; }, null, { timeout: 120000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/gallery-${name}.png` });
  }
  const stats = await page.evaluate(() => window.__holo.gallery.stats());
  await writeFile(`${out}/browser-report.json`, JSON.stringify({ stats, errors }, null, 2));
  assert.equal(stats.failed, 0); assert.deepEqual(errors, []); console.log(stats);
} finally { await browser.close(); }
