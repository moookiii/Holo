import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
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
const ids = ['xybsp', 'xy0', 'xyalt', 'xy1', 'xy2', 'xy3', 'xy4', 'xy5', 'xy5-5', 'xy6', 'xy7', 'xy8', 'xy9', 'xy9-5', 'xy9-5r', 'xy10', 'xy11', 'xy12'];
const aliases = { xybsp: 'xyp', xyalt: 'xy1', 'xy5-5': 'dc1', 'xy9-5': 'g1', 'xy9-5r': 'g1' };
const output = 'artifacts/set-logos';
await mkdir(output, { recursive: true });
await page.route('https://api.tcgdex.net/v2/en/series', r => r.fulfill({ json: [{ id: 'xy', name: 'XY' }] }));
// The local TCGL catalog must supply logos without requesting remote set metadata.
await page.route('https://api.tcgdex.net/v2/en/series/xy', () => { throw new Error('XY set metadata should remain local'); });
await page.route(process.env.HOLO_URL ?? 'http://127.0.0.1:5173/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
try {
  await page.goto(process.env.HOLO_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.evaluate(async () => {
    const { PackBrowser } = await import('/src/pokemon/PackBrowser.ts');
    new PackBrowser({ definitions: [], prepare: async () => { throw new Error('Not used'); }, open: async () => {}, viewCard: async () => {}, close: () => {} });
  });
  await page.getByRole('button', { name: /^Pok.mon/ }).click();
  await page.getByRole('button', { name: 'XY', exact: true }).click();
  const tiles = page.locator('.pokemon-pack-tile');
  assert.equal(await tiles.count(), ids.length);
  const expected = new Set(ids.map(id => `/packs/pokemon/${aliases[id] ?? id}-logo.png`));
  const observed = new Set();
  for (const tile of await tiles.all()) {
    const img = tile.locator('img');
    assert.equal(await img.count(), 1);
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(i => i.decode());
    const src = await img.getAttribute('src');
    assert.ok(expected.has(src), `Unexpected or fallback logo: ${src}`);
    assert.ok(await img.evaluate(i => i.naturalWidth > 0 && i.naturalHeight > 0));
    observed.add(src);
  }
  assert.deepEqual(observed, expected);
  await page.getByRole('dialog', { name: 'Choose a pack' }).screenshot({ path: `${output}/xy-set-picker.png` });
  console.log('All 18 local XY catalog tiles display decoded expansion logos, including special-set aliases.');
} finally { await browser.close(); }



