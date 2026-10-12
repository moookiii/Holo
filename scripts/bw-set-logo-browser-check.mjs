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
const ids = ['bw1', 'bw2', 'bw3', 'bw4', 'bw5', 'bw6', 'bw6-5', 'bw7', 'bw8', 'bw9', 'bw10', 'bw11'];
const aliases = { bwbsp: 'bwp', bwalt: 'bw1', 'bw6-5': 'dv1', bw11r: 'bw11' };
const output = 'artifacts/set-logos';
await mkdir(output, { recursive: true });
await page.route('https://api.tcgdex.net/v2/en/series', r => r.fulfill({ json: [{ id: 'bw', name: 'Black & White' }] }));
// The local TCGL catalog must supply logos without requesting remote set metadata.
await page.route('https://api.tcgdex.net/v2/en/series/bw', () => { throw new Error('BW set metadata should remain local'); });
await page.route(process.env.HOLO_URL ?? 'http://127.0.0.1:5173/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
try {
  await page.goto(process.env.HOLO_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.evaluate(async () => {
    const { PackBrowser } = await import('/src/pokemon/PackBrowser.ts');
    new PackBrowser({ definitions: [], prepare: async () => { throw new Error('Not used'); }, open: async () => {}, viewCard: async () => {}, close: () => {} });
  });
  await page.getByRole('button', { name: /^Pok.mon/ }).click();
  await page.getByRole('button', { name: 'Black & White', exact: true }).click();
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
  await page.getByRole('dialog', { name: 'Choose a pack' }).screenshot({ path: `${output}/bw-set-picker.png` });
  console.log('All 12 local Black & White catalog tiles display decoded expansion logos, including special-set aliases.');
} finally { await browser.close(); }



