import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
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
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && response.url().includes('127.0.0.1')) errors.push(`${response.status()} ${response.url()}`); });
  await page.route('https://api.tcgdex.net/v2/en/series', route => route.fulfill({ json: [{ id: 'base', name: 'Base' }] }));
  await page.route('https://api.tcgdex.net/v2/en/series/base', route => route.fulfill({ json: { id: 'base', name: 'Base', sets: [] } }));
  await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 60000 });
  for (const [label, id] of [
    ["#18 · Team Rocket's Meowth", 'pokemon:basep-18:normal'],
    ['#33 · Scizor', 'pokemon:basep-33:normal'],
    ['#50 · Celebi', 'pokemon:basep-50:normal'],
    ['#51 · Rapidash', 'pokemon:basep-51:normal'],
    ['#52 · Ho-oh', 'pokemon:basep-52:normal'],
    ['#53 · Suicune', 'pokemon:basep-53:normal'],
    ['Ancient Mew', 'ancient-mew'],
  ]) {
    await page.evaluate(() => window.__holo.pack.browse());
    await page.getByRole('button', { name: /Pokémon/ }).click();
    await page.getByRole('button', { name: /^Base$/ }).click();
    await page.getByRole('button', { name: /^Wizards Black Star Promos/ }).click();
    await page.locator('.pokemon-promo-card').first().waitFor();
    assert.equal(await page.locator('.pokemon-promo-card').count(), 54);
    const labels = await page.locator('.pokemon-promo-card').allTextContents();
    assert.match(labels.at(-2), /#53 · Suicune/);
    assert.match(labels.at(-1), /Ancient Mew/);
    await page.getByRole('button', { name: label, exact: false }).click();
    await page.waitForFunction(expected => window.__holo.stats().card === expected, id, { timeout: 30000 });
  }
  const cards = await page.evaluate(async () => {
    const { cards } = await import('/src/card/CardDefinition.ts');
    return cards.filter(card => card.pokemon?.setId === 'basep' && [18,33,50,51,52,53].includes(Number(card.pokemon.localId)))
      .map(card => ({ id: card.id, profile: card.profile, maps: card.maps }));
  });
  assert.equal(cards.length, 6);
  assert.ok(cards.every(card => card.profile === 'print-only' && card.maps === undefined));
  assert.deepEqual(errors, []);
  console.log('54 promo tiles; six added prints and Ancient Mew opened; all six are print-only.');
} finally { await browser.close(); }
