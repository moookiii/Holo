import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const out = 'artifacts/magic-alpha';
await mkdir(out, { recursive: true });
const options = { headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] };
if (process.env.BROWSER_EXECUTABLE) options.executablePath = process.env.BROWSER_EXECUTABLE;
else if (!existsSync(chromium.executablePath())) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const executable = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(executable)) { options.executablePath = executable; break; }
  }
}
const browser = await chromium.launch(options);
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], screenshots = [];
page.on('pageerror', error => errors.push(String(error)));
const capture = async name => { await page.waitForTimeout(250); await page.screenshot({ path: `${out}/${name}.png` }); screenshots.push(name); };
let report;
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  await page.locator('.gallery-header').getByRole('button', { name: 'Open a pack', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Magic: The Gathering', exact: false }).click();
  await dialog.getByRole('button', { name: 'Limited Edition', exact: true }).click();
  await capture('sets');
  await dialog.getByRole('button', { name: /^Alpha/ }).click();
  await capture('product');
  await dialog.getByRole('button', { name: /^Booster pack/ }).click();
  await page.waitForFunction(() => window.__holo.pack.stats().state === 'PackReady', null, { timeout: 120000 });
  const stats = await page.evaluate(() => ({ pack: window.__holo.pack.stats(), loading: window.__holo.stats().packMetrics }));
  assert.equal(stats.pack.cardCount, 15);
  assert.equal(stats.loading.holoMaterials, 0);
  assert.equal(stats.loading.printMaterials, 15);
  assert.equal(stats.loading.usedCpuPreparation, true);
  assert.equal(stats.loading.preparedCards, 15);
  await capture('sealed');
  await page.evaluate(() => { window.__holo.pack.setStage('reveal', 0); window.__holo.pack.tick(2); });
  await capture('reveal');
  await page.evaluate(() => { window.__holo.pack.summary(); window.__holo.pack.tick(3); });
  await capture('summary');
  await page.setViewportSize({ width: 430, height: 900 });
  await page.waitForFunction(() => window.__holo.camera.aspect < .85);
  await page.evaluate(() => window.__holo.pack.summary());
  assert.ok(await page.evaluate(() => window.__holo.camera.position.z < window.__holo.camera.far));
  await capture('summary-portrait');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForFunction(() => window.__holo.camera.aspect > 1);
  await page.evaluate(() => window.__holo.pack.summary());
  await page.evaluate(() => { window.__holo.pack.select(14); window.__holo.pack.advance(); window.__holo.pack.tick(3); });
  await page.waitForFunction(() => window.__holo.pack.stats().state === 'Closed', null, { timeout: 30000 });
  await capture('viewer');
  assert.equal(await page.locator('#holo-select option:not([disabled])').count(), 1);
  assert.equal(await page.locator('#holo-select').inputValue(), 'print-only');
  await page.getByRole('button', { name: 'Studio lighting', exact: true }).click();
  await page.getByRole('button', { name: 'Skim', exact: true }).click();
  await page.evaluate(() => window.__holo.pose(-25, 12));
  await capture('viewer-skim');
  await page.waitForFunction(() => window.__holo.stats().preparedPack?.cardIds.length > 0, null, { timeout: 30000 });
  const nextPrepared = await page.evaluate(() => window.__holo.stats().preparedPack);
  await page.evaluate(() => window.__holo.pack.open());
  await page.waitForFunction(() => window.__holo.pack.stats().state === 'PackReady', null, { timeout: 60000 });
  const next = await page.evaluate(() => ({ pack: window.__holo.pack.stats(), loading: window.__holo.stats().packMetrics }));
  assert.deepEqual([...new Set(next.pack.cardIds)], nextPrepared.cardIds);
  assert.equal(next.loading.lastWasPrepared, true);
  assert.equal(next.loading.cpuGenerationMs, 0);
  assert.equal(next.loading.holoMaterials, 0);
  await page.evaluate(() => window.__holo.pack.close());
  await page.evaluate(() => window.__holo.gallery.open());
  await page.getByLabel('Game', { exact: true }).selectOption('Magic: The Gathering');
  await page.getByLabel('Set', { exact: true }).selectOption('Limited Edition Alpha');
  await page.waitForFunction(() => document.querySelector('.gallery-header p')?.textContent?.includes('295'));
  await page.waitForFunction(() => window.__holo.gallery.stats().pending === 0, null, { timeout: 30000 });
  await capture('gallery');
  const gallery = await page.evaluate(() => window.__holo.gallery.stats());
  // Back navigation and another selection must still work after inspection.
  await page.locator('.gallery-header').getByRole('button', { name: 'Open a pack', exact: true }).click();
  await dialog.getByRole('button', { name: /^Magic: The Gathering/ }).click();
  await dialog.getByRole('button', { name: '← Back', exact: true }).click();
  assert.ok(await dialog.getByRole('button', { name: /^Pokémon/ }).isVisible());
  assert.ok(await dialog.getByRole('button', { name: /^Yu-Gi-Oh!/ }).isVisible());
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  assert.deepEqual(errors, []);
  const compact = entry => ({ pack: { state: entry.pack.state, cardCount: entry.pack.cardCount, cardIds: entry.pack.cardIds }, loading: entry.loading });
  report = { stats: compact(stats), next: compact(next), gallery, errors, screenshots };
  console.log(JSON.stringify({ cardCount: stats.pack.cardCount, materials: { print: stats.loading.printMaterials, holo: stats.loading.holoMaterials },
    preparedCards: stats.loading.preparedCards, nextWasPrepared: next.loading.lastWasPrepared, nextCpuGenerationMs: next.loading.cpuGenerationMs, galleryCards: gallery.filtered, errors }, null, 2));
} catch (error) {
  await capture('failure'); report = { failure: String(error), errors, screenshots };
  console.log(JSON.stringify(report, null, 2)); process.exitCode = 1;
} finally { await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2)); await browser.close(); }
