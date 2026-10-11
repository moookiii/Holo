import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const catalog = JSON.parse(await readFile('src/gallery/showdown-sprites.generated.json', 'utf8'));
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ?? `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1234/chrome-win64/chrome.exe`, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(String(e)));
const requests = []; page.on('request', r => { if (r.url().includes('/sprites/ani/')) requests.push(r.url()); });
try {
  await page.goto(process.env.HOLO_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__holo?.gallery.stats()?.active, null, { timeout: 120000 });
  const toggle = page.getByRole('button', { name: '◉ Pokémon', exact: true });
  const panel = page.getByRole('dialog', { name: 'Choose a Pokémon' });
  const search = page.getByRole('searchbox', { name: 'Search gallery cards' });
  await search.fill('old query');
  assert.equal(requests.length, 0);
  const start = Date.now(); await toggle.click(); await panel.waitFor(); const openMs = Date.now() - start;
  assert.ok(await panel.locator('[data-pokemon-index]').count() <= 12);
  await page.waitForTimeout(400);
  assert.ok(requests.length <= 12);
  const sprite = panel.getByRole('button', { name: 'Bulbasaur', exact: true }).locator('img');
  await sprite.evaluate(img => new Promise((resolve, reject) => {
    if (img.complete && img.naturalWidth) return resolve();
    img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', reject, { once: true });
  }));
  assert.ok(await sprite.evaluate(img => {
    const rect = img.getBoundingClientRect(); return Math.abs(rect.width / rect.height - img.naturalWidth / img.naturalHeight) < .02;
  }));
  await panel.getByRole('button', { name: 'Bulbasaur', exact: true }).click();
  await assert.doesNotReject(() => search.inputValue().then(v => assert.equal(v, 'Bulbasaur')));
  assert.equal(await panel.isVisible(), false);
  await page.waitForFunction(() => window.__holo.gallery.instance().query.search === 'Bulbasaur');
  assert.ok(await page.evaluate(() => window.__holo.gallery.stats().filtered) > 0);
  const game = page.getByRole('combobox', { name: 'Game', exact: true }); await game.selectOption('Yu-Gi-Oh!');
  for (const name of ['Nidoran♀', 'Nidoran♂', 'Farfetch’d', 'Mr. Mime', 'Flabébé', 'Charizard-Mega-X', 'Raichu-Alola', 'Venusaur-Gmax', 'Blastoise-Gmax', 'Pikachu-World']) {
    await toggle.click();
    const index = catalog.findIndex(p => p.name === name);
    await panel.locator('.pokemon-selector-scroll').evaluate((el, i) => { el.scrollTop = i * 76; }, index);
    await panel.getByRole('button', { name, exact: true }).click();
    assert.equal(await search.inputValue(), name); assert.equal(await game.inputValue(), 'Yu-Gi-Oh!');
    assert.equal(await page.evaluate(() => window.__holo.gallery.stats().filtered), 0);
  }
  await toggle.click(); await page.keyboard.press('Escape'); assert.equal(await panel.isVisible(), false);
  await toggle.click(); await search.click(); assert.equal(await panel.isVisible(), false);
  await toggle.click(); await page.keyboard.press('End');
  await page.waitForTimeout(100); assert.ok(await panel.locator('[data-pokemon-index]').count() <= 12);
  for (const fraction of [0, .25, .5, .75, 1, .5, 0]) {
    await panel.locator('.pokemon-selector-scroll').evaluate((el, fraction) => { el.scrollTop = (el.scrollHeight - el.clientHeight) * fraction; }, fraction);
    await page.waitForTimeout(40); assert.ok(await panel.locator('[data-pokemon-index]').count() <= 12);
  }
  await panel.getByRole('button', { name: 'Close Pokémon selector' }).focus();
  await page.keyboard.press('Home'); await page.waitForTimeout(200);
  await mkdir('artifacts/gallery-sprite-selector', { recursive: true });
  await page.screenshot({ path: 'artifacts/gallery-sprite-selector/desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(200);
  assert.ok(await panel.evaluate(el => el.getBoundingClientRect().right <= innerWidth));
  await page.screenshot({ path: 'artifacts/gallery-sprite-selector/mobile.png' });
  // A failed GIF retains a selectable name and never retries on reopen.
  await page.route('**/sprites/ani/bulbasaur.gif', route => route.abort());
  await page.keyboard.press('Escape'); await toggle.click();
  await panel.locator('.pokemon-selector-scroll').evaluate(el => { el.scrollTop = 0; });
  await page.waitForTimeout(300);
  await panel.getByRole('button', { name: 'Bulbasaur', exact: true }).getByLabel('Animation unavailable').waitFor();
  await panel.getByRole('button', { name: 'Bulbasaur', exact: true }).click();
  assert.equal(await search.inputValue(), 'Bulbasaur');
  assert.deepEqual(errors, []);
  const report = { openMs, spriteRequests: requests.length, catalogEntries: catalog.length, errors };
  await writeFile('artifacts/gallery-sprite-selector/report.json', JSON.stringify(report, null, 2)); console.log(report);
} finally { await browser.close(); }
