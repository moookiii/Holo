import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const version of (await readdir(root)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const path = join(root, version, 'chrome-win64/chrome.exe');
    if (existsSync(path)) { executablePath = path; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const out = 'artifacts/dragon-discovery/browser'; await mkdir(out, { recursive: true });
const errors = [], results = {};
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) errors.push(`${r.status()} ${r.url()}`); });
// Stub only remote series discovery. Real local catalog, wrapper and pack preparation run.
await page.route('https://api.tcgdex.net/v2/en/series', r => r.fulfill({ json: [{ id: 'sv', name: 'Scarlet & Violet' }] }));
await page.route('https://api.tcgdex.net/v2/en/series/sv', r => r.fulfill({ json: { id: 'sv', name: 'Scarlet & Violet', sets: [] } }));
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  await page.getByRole('combobox', { name: 'Set', exact: true }).selectOption({ label: "McDonald's Dragon Discovery" });
  await page.waitForFunction(() => {
    const stats = window.__holo.gallery.stats();
    return stats.filtered === 15 && stats.visible === stats.visibleExpected && stats.pending === 0;
  }, null, { timeout: 90000 });
  results.gallery = await page.evaluate(() => window.__holo.gallery.stats());
  await page.screenshot({ path: `${out}/gallery.png` });
  for (const [number, variant] of [[1, 'normal'], [2, 'holo'], [12, 'holo'], [15, 'holo']]) {
    await page.evaluate(id => window.__holo.gallery.close(id), `pokemon:2024sv-${number}:${variant}`);
    await page.evaluate(() => window.__holo.pose(0, 0, 0));
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${out}/card-${number}.png` });
  }
  await page.evaluate(() => window.__holo.pack.browse());
  await page.getByRole('button', { name: /^Pokémon/ }).click();
  await page.getByRole('button', { name: /^Scarlet & Violet/ }).click();
  await page.screenshot({ path: `${out}/sets.png` });
  await page.locator('button').filter({ has: page.getByText("McDonald's Dragon Discovery", { exact: true }) }).click();
  await page.getByRole('button', { name: /English four-card booster/ }).waitFor();
  await page.screenshot({ path: `${out}/wrapper-picker.png` });
  await page.getByRole('button', { name: /English four-card booster/ }).click();
  await page.waitForFunction(() => window.__holo.pack.stats().state === 'PackReady', null, { timeout: 90000 });
  results.pack = await page.evaluate(() => window.__holo.pack.stats());
  assert.equal(results.pack.cardCount, 4);
  await page.screenshot({ path: `${out}/pack-ready.png` });
  await page.evaluate(() => window.__holo.pack.summary());
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${out}/pack-summary.png` });
  assert.equal(errors.length, 0, errors.join('\n'));
} catch (error) {
  results.failure = String(error); process.exitCode = 1;
  await page.screenshot({ path: `${out}/failure.png` });
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify({ ...results, errors }, null, 2));
  await browser.close();
}
