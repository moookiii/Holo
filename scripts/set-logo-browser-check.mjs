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
const ids = ['me01', 'me02', 'me02.5', 'me03', 'me04', 'me05'];
const output = 'artifacts/set-logos';
await mkdir(output, { recursive: true });
// Exercise the local catalog replacement with the same logo metadata as TCGdex.
await page.route('https://api.tcgdex.net/v2/en/series', r => r.fulfill({ json: [{ id: 'me', name: 'Mega Evolution' }] }));
await page.route('https://api.tcgdex.net/v2/en/series/me', r => r.fulfill({ json: {
  id: 'me', name: 'Mega Evolution', sets: ids.map(id => ({ id, name: id, logo: `https://assets.tcgdex.net/en/me/${id}/logo` })),
} }));
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  await page.evaluate(() => { window.__holo.gallery.close('pokemon:30th-001:holo'); window.__holo.pack.browse(); });
  await page.getByRole('button', { name: /^Pok.mon/ }).click();
  await page.getByRole('button', { name: /^Mega Evolution/ }).click();
  const tiles = page.locator('.pokemon-pack-tile');
  assert.equal(await tiles.count(), 8);
  for (const [index, tile] of (await tiles.all()).entries()) {
    const img = tile.locator('img');
    assert.equal(await img.count(), 1);
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(i => i.decode());
    if (index < 6) assert.equal(await img.getAttribute('src'), `https://assets.tcgdex.net/en/me/${ids[index]}/logo.webp`);
    else {
      assert.match(await img.evaluate(i => getComputedStyle(i).maskImage), /30th-logo-mask\.png/);
      assert.equal(await img.evaluate(i => getComputedStyle(i).maskSize), 'contain');
    }
  }
  await page.getByRole('dialog', { name: 'Choose a pack' }).screenshot({ path: `${output}/mega-set-picker.png` });
  console.log('All six TCGdex logos decoded; both anniversary tiles use the registered PNG cutout.');
} finally { await browser.close(); }
