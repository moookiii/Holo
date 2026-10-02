import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(root)).filter(name => /^chromium-\d+$/.test(name)).sort().reverse()) {
    const candidate = join(root, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const out = join(process.cwd(), 'artifacts', 'legendary-collection-browser');
await mkdir(out, { recursive: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && response.url().includes('127.0.0.1')) errors.push(`${response.status()} ${response.url()}`); });
// Only discovery is stubbed to keep live API outages out of this local UI test.
// Actual Legendary Collection metadata, assets, collation, preparation and rendering run normally.
await page.route('https://api.tcgdex.net/v2/en/series', route => route.fulfill({ json: [{ id: 'lc', name: 'Legendary Collection' }] }));
try {
  await page.goto('http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  await page.evaluate(() => window.__holo.pack.browse());
  await page.getByRole('button', { name: /Pok.mon/ }).click();
  await page.getByRole('button', { name: /^Legendary Collection$/ }).click();
  await page.getByRole('button', { name: /^Legendary Collection Opening available/ }).click();
  assert.equal(await page.locator('button.pokemon-booster').count(), 4);
  await page.locator('button.pokemon-booster').first().click();
  await page.waitForFunction(() => window.__holo.pack.stats().state === 'PackReady', null, { timeout: 180000 });
  const pulls = await page.evaluate(() => window.__holo.pack.stats().meshIds.map(id => {
    const card = window.__holo.scene.getObjectByProperty('uuid', id).userData.cardInstance.definition;
    return { id: card.pokemon.id, variant: card.pokemon.variant };
  }));
  assert.equal(pulls.length, 11);
  assert.ok(pulls.every(p => p.id.startsWith('lc-')));
  assert.equal(pulls[10].variant, 'reverse');
  await page.evaluate(() => { window.__holo.pack.setStage('reveal', 10); window.__holo.pack.tick(2); });
  await page.screenshot({ path: join(out, 'pack-reverse.png') });
  await page.evaluate(() => window.__holo.pack.close());
  for (const number of [5, 9, 11]) {
    await page.evaluate(async n => { await window.__holo.setCard(`pokemon:lc-${n}:holo`); window.__holo.pose(8, -12); }, number);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(out, `holo-${number}.png`) });
  }
  assert.deepEqual(errors, []);
  console.log('LC pack flow: 11 cards, reverse slot, four wrappers; regular holos render without errors.');
} catch (error) {
  await page.screenshot({ path: join(out, 'failure.png') });
  console.error(error, errors); process.exitCode = 1;
} finally { await browser.close(); }
