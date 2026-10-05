import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(root)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = join(root, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const out = join(process.cwd(), 'artifacts', 'vending'); await mkdir(out, { recursive: true });
const errors = [], requests = [], results = {};
page.on('pageerror', e => errors.push(e.message));
page.on('request', r => requests.push(r.url()));
page.on('response', r => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) errors.push(`${r.status()} ${r.url()}`); });
const url = process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173';
// Real selectors, catalogs, wrappers and collators. Only external discovery and
// the expensive GPU preparation boundary are controlled for reproducibility.
await page.route(`${url}/vending-check`, r => r.fulfill({ contentType: 'text/html', body: '<html><head><style>body{margin:0;font-family:Arial;background:#090b0e}</style></head><body></body></html>' }));
await page.route('https://api.tcgdex.net/v2/en/series', r => r.fulfill({ json: [{ id: 'base', name: 'Wizards of the Coast' }, { id: 'neo', name: 'Neo' }] }));
await page.route('https://api.tcgdex.net/v2/en/series/base', r => r.fulfill({ json: { id: 'base', name: 'Wizards of the Coast', sets: [
  { id: 'base1', name: 'Base Set' }, { id: 'base2', name: 'Jungle' }, { id: 'base3', name: 'Fossil' }, { id: 'base4', name: 'Base Set 2' }, { id: 'base5', name: 'Team Rocket' },
] } }));
await page.route('https://api.tcgdex.net/v2/en/series/neo', r => r.fulfill({ json: { id: 'neo', name: 'Neo', sets: [] } }));
const ygo = JSON.parse(await readFile('public/catalog/yugioh/sets.json', 'utf8'));
await page.route('https://db.ygoprodeck.com/api/v7/cardsets.php', r => r.fulfill({ json: ygo.records }));

async function launch() {
  await page.evaluate(async () => {
    const { PackBrowser } = await import('/src/pokemon/PackBrowser.ts');
    window.prepared = []; window.opened = []; window.closed = 0;
    window.picker = new PackBrowser({ definitions: [],
      prepare: async (definition, seed, cards, signal) => {
        signal.throwIfAborted(); window.prepared.push({ id: definition.id, count: definition.cardCount, wrapper: definition.wrapper.front, cards: cards.map(c => c.id) });
        if (window.failPreparation) { window.failPreparation = false; throw new Error('Test preparation failure'); }
        return { definition };
      },
      open: async pack => { window.opened.push(pack.definition.id); },
      viewCard: async () => {}, close: () => window.closed++,
    });
  });
}
async function vending() {
  await page.getByRole('button', { name: 'Vending Machine', exact: true }).click();
  await page.locator('.vm-count').filter({ hasText: /sets?/ }).waitFor();
  await page.mouse.move(1300, 900); // Keep attract state until explicitly entered.
}
async function wake() { await page.locator('.vm-attract').evaluate(n => n.click()); }
async function game(name) { await page.locator('.vm-games').getByRole('button', { name, exact: true }).click(); await page.waitForFunction(() => document.querySelector('.vm-status')?.textContent?.startsWith('Choose a pack')); }
async function choose(name) { await page.locator('.vm-product').filter({ hasText: name }).first().click(); await page.locator('.vm-sheet').waitFor(); }
async function dispense() { await page.getByRole('button', { name: 'DISPENSE PACK ↓', exact: true }).click(); await page.waitForFunction(() => window.opened.length === 1); }

try {
  await page.goto(`${url}/vending-check`); await launch();
  assert.equal(await page.locator('.pokemon-pack-tile').count(), 4);
  const start = requests.length; await vending();
  await page.screenshot({ path: join(out, 'attract-desktop.png') });
  results.shellMs = await page.evaluate(() => performance.getEntriesByName('vending-entry-to-shell').at(-1).duration);
  assert.ok(await page.locator('.vm-attract').isVisible());
  await wake(); await page.locator('.vm-product img').first().waitFor();
  await page.screenshot({ path: join(out, 'catalog-desktop.png') });
  results.browsingRequests = requests.slice(start).filter(u => /\/packs\/|\/cards\//.test(u));
  assert.ok(results.browsingRequests.every(u => u.includes('/packs/thumbnails/')), JSON.stringify(results.browsingRequests));
  assert.equal(await page.evaluate(() => window.prepared.length), 0);
  results.initialTiles = await page.locator('.vm-product').count();
  await choose('Jungle');
  assert.equal(await page.locator('[data-art-id="random"]').getAttribute('aria-pressed'), 'true');
  await page.screenshot({ path: join(out, 'details-desktop.png') });
  assert.equal(await page.evaluate(() => window.prepared.length), 0);
  await page.keyboard.press('Escape'); assert.equal(await page.locator('.vm-sheet').count(), 0);
  await page.locator('.vm-search').fill('Jungle'); assert.equal(await page.locator('.vm-product').count(), 1);
  await choose('Jungle');
  await page.locator('.vm-search').fill('Fossil'); assert.equal(await page.locator('.vm-sheet').count(), 0);
  await page.locator('.vm-search').fill('');
  await page.getByLabel('Pack availability').selectOption('browse');
  await choose('Promos'); assert.ok(await page.getByRole('button', { name: 'BROWSE ONLY', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'Classic', exact: true }).click();
  assert.equal(await page.locator('.pokemon-pack-tile').count(), 4); assert.ok(await page.getByRole('heading', { name: 'Open Pack' }).isVisible());
  await vending(); await wake(); await choose('Jungle');
  const specific = await page.locator('.vm-art-options button').nth(1).getAttribute('data-art-id');
  await page.locator('.vm-art-options button').nth(1).click();
  await page.evaluate(() => window.failPreparation = true);
  await page.getByRole('button', { name: 'DISPENSE PACK ↓', exact: true }).click();
  await page.locator('.vm-status').filter({ hasText: 'Test preparation failure' }).waitFor();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.waitForFunction(() => window.opened.length === 1);
  results.pokemonSpecific = await page.evaluate(() => window.prepared.at(-1));
  assert.equal(results.pokemonSpecific.id, `pokemon:base2:${specific}`);
  await launch(); await vending(); await wake(); await choose('Fossil'); await dispense();
  results.pokemonRandom = await page.evaluate(() => window.prepared[0]); assert.match(results.pokemonRandom.id, /^pokemon:base3:/);
  await launch(); await vending(); await game('Yu-Gi-Oh!');
  await page.getByLabel('Series or era').selectOption('');
  await page.waitForFunction(() => Number(document.querySelector('.vm-count')?.textContent?.split(' ')[0]) > 100);
  results.yugiohCount = await page.locator('.vm-count').textContent(); results.virtualTiles = await page.locator('.vm-product').count();
  assert.ok(results.virtualTiles <= 15);
  await page.locator('.vm-products').evaluate(n => n.scrollTop = n.scrollHeight / 2);
  await page.waitForTimeout(80); assert.ok(await page.locator('.vm-product').count() <= 15);
  await page.getByLabel('Pack availability').selectOption('openable');
  await choose('Legend of Blue Eyes'); await dispense();
  results.yugioh = await page.evaluate(() => window.prepared[0]); assert.equal(results.yugioh.id, 'yugioh:lob:na-2002:first-edition');
  await launch(); await vending(); await game('Magic'); await choose('Alpha'); await dispense();
  results.magic = await page.evaluate(() => window.prepared[0]); assert.equal(results.magic.id, 'magic:lea:booster');
  // Classic still calls the same pipeline after switching back.
  await launch(); await vending(); await page.getByRole('button', { name: 'Classic', exact: true }).click();
  await page.getByRole('button', { name: /^Magic: The Gathering/ }).click();
  await page.locator('.pokemon-pack-tile').first().click(); await page.locator('.pokemon-pack-tile').first().click();
  await page.getByRole('button', { name: /^Booster pack/ }).click();
  await page.waitForFunction(() => window.opened.length === 1); assert.equal(await page.evaluate(() => window.opened[0]), 'magic:lea:booster');
  // Narrow layout and reduced motion; cancellation never prepares a pack.
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await launch(); await vending(); await wake(); await choose('Jungle');
  await page.screenshot({ path: join(out, 'details-mobile.png') });
  assert.ok(await page.locator('.vm-dispense').isVisible());
  results.mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(results.mobileOverflow, false);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  assert.equal(await page.evaluate(() => window.prepared.length), 0);
  assert.equal(await page.locator('dialog').count(), 0);
  results.errors = errors; assert.deepEqual(errors, []);
  await writeFile(join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
