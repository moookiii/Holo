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
const pilot = process.env.SM_PILOT === '1';
const out = `artifacts/sm-pack-art/live-${pilot ? 'pilot' : 'series'}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [], requests = [], results = { viewers: [], packs: [] };
page.on('pageerror', e => errors.push(e.message));
page.on('request', r => requests.push(r.url()));
page.on('response', r => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) errors.push(`${r.status()} ${r.url()}`); });
await page.route('https://api.tcgdex.net/v2/en/series', r => r.fulfill({ json: [{ id: 'sm', name: 'Sun & Moon' }] }));
const products = [['sm1','Sun & Moon'],['sm2','Guardians Rising'],['sm3','Burning Shadows'],['sm3-5','Shining Legends'],['sm4','Crimson Invasion'],['sm5','Ultra Prism'],['sm6','Forbidden Light'],['sm7','Celestial Storm'],['sm7-5','Dragon Majesty'],['sm8','Lost Thunder'],['sm9','Team Up'],['gum','Detective Pikachu'],['sm10','Unbroken Bonds'],['sm11','Unified Minds'],['sm11-5','Hidden Fates (including Shiny Vault)'],['sm12','Cosmic Eclipse']];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  await page.evaluate(() => window.__holo.lighting.setPreset('Studio'));
  for (const [sid, name] of pilot ? products.slice(0,1) : products) {
    if (results.packs.length === 0) {
      await page.evaluate(() => window.__holo.pack.browse());
      await page.getByRole('button', { name: /^Pokémon/ }).click();
      await page.getByRole('button', { name: /^Sun & Moon/ }).click();
    } else {
      await page.locator('.pokemon-browser header button').first().click();
    }
    await page.locator('button').filter({ has: page.getByText(name, { exact: true }) }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('.pokemon-booster img')].every(im => im.complete && im.naturalWidth > 0));
    const images = await page.locator('.pokemon-booster img').evaluateAll(images => images.map(im => ({ url: im.src, width: im.naturalWidth, height: im.naturalHeight })));
    results.packs.push({ sid, images });
    await page.screenshot({ path: `${out}/${sid}-picker.png` });
  }
  results.localAssetRequests = requests.filter(u => u.includes('/tcgl-sm/')).length;
  results.externalCardRequests = requests.filter(u => /assets\.tcgdex\.net.*\/cards\/|images\.pokemontcg\.io/.test(u));
  assert.deepEqual(results.externalCardRequests, []);
  assert.deepEqual(errors, []);
} catch (error) { results.failure = String(error); process.exitCode = 1; }
finally { await writeFile(`${out}/report.json`, JSON.stringify({ results, errors }, null, 2)); await browser.close(); }
console.log(JSON.stringify({ failure: results.failure, errors, viewers: results.viewers.length, packs: results.packs.length }));
