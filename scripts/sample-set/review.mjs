import { chromium } from 'playwright';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const output = 'artifacts/sample-set';
await mkdir(output, { recursive: true });
const options = { headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] };
if (process.env.BROWSER_EXECUTABLE) options.executablePath = process.env.BROWSER_EXECUTABLE;
else if (!existsSync(chromium.executablePath())) {
  const base = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const executable = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(executable)) { options.executablePath = executable; break; }
  }
}
const browser = await chromium.launch(options);
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [], warnings = [], failures = [], checks = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
  if (message.type() === 'warning') warnings.push(message.text());
});
page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
const ids = ['002','004','016','019','021','042','048','074','083','088'];
try {
  await page.goto(process.env.HOLO_REVIEW_URL ?? 'http://127.0.0.1:5173/?lab&card=pokemon:sp-002:normal', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  for (const id of ids) {
    await page.evaluate(id => window.__holo.setCard(`pokemon:sp-${id}:normal`), id);
    await page.evaluate(() => { window.__holo.pose(0,0,0); window.__holo.zoom(1.35); });
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.__holo.stats().profile), 'print-only');
    await page.screenshot({ path: `${output}/${id}-front.png` });
  }
  checks.push('All ten single-card viewers load with print-only response');
  for (const [name, yaw, pitch, light] of [['tilted',-28,24,'Studio'],['specular',-15,-15,'Strip'],['dark',12,10,'Low key'],['back',180,0,'Studio']]) {
    await page.evaluate(([yaw,pitch,light]) => { window.__holo.lighting.setPreset(light); window.__holo.pose(yaw,pitch,0); }, [yaw,pitch,light]);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${output}/${name}.png` });
  }
  await page.evaluate(() => { window.__holo.lighting.setPreset('Studio'); window.__holo.pose(0,0,0); });
  await page.locator('#gallery-open').click();
  await page.getByRole('combobox', { name: 'Set', exact: true }).selectOption('Pokémon e-Card Sample Set');
  await page.waitForTimeout(2000);
  assert.equal(await page.locator('.gallery [data-card-index]').count(), 10);
  await page.screenshot({ path: `${output}/gallery.png` });
  await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill('Pichu');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.gallery [data-card-index]').count(), 1);
  await page.locator('.gallery [data-card-index]').click();
  await page.waitForFunction(() => window.__holo.stats().card === 'pokemon:sp-083:normal');
  checks.push('Gallery set filter, name search and gallery-to-viewer navigation');
  await page.locator('#pack-open').click();
  const dialog = page.locator('.pokemon-browser');
  await dialog.getByRole('button', { name: 'Pokémon', exact: false }).filter({ hasText: 'Browse series' }).click();
  await dialog.getByRole('button', { name: 'E-Card', exact: true }).click({ timeout: 60000 });
  const setNames = await dialog.locator('.pokemon-pack-tile strong').allTextContents();
  assert.equal(setNames[0], 'Pokémon e-Card Sample Set');
  await dialog.getByRole('button', { name: /Pokémon e-Card Sample Set/ }).click();
  assert.match(await dialog.textContent(), /packaging and participant allocation are unknown/);
  await dialog.getByRole('button', { name: /Open demonstration collection/ }).click();
  await page.waitForFunction(() => document.querySelectorAll('.pokemon-collection-card').length === 10);
  assert.deepEqual(await dialog.locator('.pokemon-collection-card').evaluateAll(elements => elements.map(e => e.dataset.cardId)), ids.map(id => `sp-${id}`));
  await page.screenshot({ path: `${output}/demonstration-open.png` });
  await dialog.locator('[data-card-id="sp-016"]').click();
  await page.waitForFunction(() => window.__holo.stats().card === 'pokemon:sp-016:normal');
  checks.push('Chronological E-Card picker, fixed demonstration opening, all ten exact contents and product-to-viewer navigation');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.equal(failures.length, 0, JSON.stringify(failures));
} catch (error) {
  errors.push(String(error));
  await page.screenshot({ path: `${output}/failure.png` });
  process.exitCode = 1;
} finally {
  const report = { checks, errors, warnings, failures, stats: await page.evaluate(() => window.__holo?.stats()).catch(() => undefined) };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
