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
const out = `artifacts/sm-integration/${pilot ? 'pilot' : 'series'}`;
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
  const ids = pilot ? ['pokemon:sm1-66:holo','pokemon:sm1-143:holo','pokemon:sm1-154:holo','pokemon:sm1-162:holo'] :
    ['pokemon:sm9-33:holo','pokemon:sm3-5-40:holo','pokemon:sm11-5-70:holo','pokemon:sm11-5-118:holo','pokemon:sm12-239:holo','pokemon:gum-12:holo','pokemon:sm5-62:holo','pokemon:sm1-10:reverse'];
  for (const id of [...ids, 'pokemon:sv08.5-155:holo', 'pokemon:sv08.5-156:holo']) {
    await page.evaluate(async id => await window.__holo.gallery.close(id), id);
    for (const [name, light, yaw, pitch] of [
      ['front', 'Studio', 0, 0], ['grazing', 'Holo skim', 55, -15],
      ['moving', 'Moving light', -15, -15], ['tilt', 'Studio', -28, 24],
      ['dark', 'Low key', -15, -15], ['specular', 'Strip', -15, -15],
    ]) {
      await page.evaluate(([light,y,p]) => { window.__holo.lighting.setPreset(light); window.__holo.pose(y,p,0); }, [light,yaw,pitch]);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${out}/${id.replaceAll(':','-')}-${name}.png` });
    }
    results.viewers.push({ id, stats: await page.evaluate(() => window.__holo.stats()) });
  }
  await page.evaluate(() => window.__holo.lighting.setPreset('Studio'));
  for (const [sid, name] of pilot ? products.slice(0,1) : products) {
    await page.evaluate(() => window.__holo.pack.browse());
    await page.getByRole('button', { name: /^Pokémon/ }).click();
    await page.getByRole('button', { name: /^Sun & Moon/ }).click();
    await page.locator('button').filter({ has: page.getByText(name, { exact: true }) }).click();
    await page.locator('.pokemon-booster').first().click();
    await page.waitForFunction(() => window.__holo.pack.stats().state === 'PackReady', null, { timeout: 120000 });
    const stats = await page.evaluate(() => window.__holo.pack.stats());
    assert.equal(stats.cardCount, sid === 'gum' ? 4 : 11);
    results.packs.push({ sid, stats, preparation: await page.evaluate(() => window.__holo.opening()) });
    await page.screenshot({ path: `${out}/${sid}-ready.png` });
    await page.evaluate(() => window.__holo.pack.summary());
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${sid}-summary.png` });
    await page.evaluate(() => window.__holo.pack.close());
  }
  results.localAssetRequests = requests.filter(u => u.includes('/tcgl-sm/')).length;
  results.externalCardRequests = requests.filter(u => /assets\.tcgdex\.net.*\/cards\/|images\.pokemontcg\.io/.test(u));
  assert.deepEqual(results.externalCardRequests, []);
  assert.deepEqual(errors, []);
} catch (error) { results.failure = String(error); process.exitCode = 1; }
finally { await writeFile(`${out}/report.json`, JSON.stringify({ results, errors }, null, 2)); await browser.close(); }
console.log(JSON.stringify({ failure: results.failure, errors, viewers: results.viewers.length, packs: results.packs.length }));
