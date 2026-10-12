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
const out = 'artifacts/bw-integration';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [], requests = [], results = { viewers: [], packs: [] };
page.on('pageerror', e => errors.push(e.message));
page.on('request', r => requests.push(r.url()));
page.on('response', r => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) errors.push(`${r.status()} ${r.url()}`); });
await page.route('https://api.tcgdex.net/v2/en/series', r => r.fulfill({ json: [{ id: 'bw', name: 'BW' }] }));
const products = [['bw1','Black & White'],['bw2','Emerging Powers'],['bw3','Noble Victories'],['bw4','Next Destinies'],['bw5','Dark Explorers'],['bw6','Dragons Exalted'],['bw6-5','Dragon Vault'],['bw7','Boundaries Crossed'],['bw8','Plasma Storm'],['bw9','Plasma Freeze'],['bw10','Plasma Blast'],['bw11','Legendary Treasures']];
try {
  await page.goto(process.env.HOLO_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  results.startupBWRequests = requests.filter(u => u.includes('/tcgl-bw/')).length;
  await page.evaluate(() => window.__holo.gallery.open());
  await page.getByLabel('Set', {exact:true}).selectOption('Black & White');
  await page.getByLabel('Search gallery cards').fill('Snivy');
  await page.getByLabel('Finish', {exact:true}).selectOption('reverse');
  await page.waitForTimeout(1200);
  const weedle = page.locator('[data-card-index]').filter({hasText:'Snivy'}).first();
  await weedle.click({modifiers:['Shift']});
  await page.getByRole('button',{name:'Open Favorites binder',exact:true}).click();
  await page.waitForFunction(() => {
    const binder = window.__holo.gallery.stats();
    return binder?.binder && binder.active && binder.visible === 1 && binder.visibleFailed === 0 && !binder.preparing;
  }, null, {timeout:90000});
  results.binder = await page.evaluate(() => window.__holo.gallery.stats());
  assert.equal(await page.locator('.binder-card[data-card-id="pokemon:bw1-1:reverse"]').count(), 1);
  await page.screenshot({path:`${out}/bw-favorite-binder.png`});
  await page.getByRole('button',{name:'Close Favorites binder',exact:true}).click();
  await page.evaluate(() => window.__holo.gallery.close('pokemon:bw1-1:reverse'));
  results.galleryFavoritesBinder = 'passed';
  const ids = ['pokemon:bw1-1:reverse','pokemon:bw1-5:holo','pokemon:bw2-97:holo','pokemon:bw3-1:reverse','pokemon:bw6-89:reverse','pokemon:bw8-13:reverse','pokemon:bw4-98:holo','pokemon:bw7-149:holo','pokemon:bw9-122:holo','pokemon:bw7-137:holo','pokemon:bw11r-24:holo','pokemon:bw11-114:holo','pokemon:bwalt-22:holo','pokemon:bwalt-34:holo','pokemon:bwbsp-6:holo'];
  for (const id of [...ids, 'pokemon:sv08.5-155:holo', 'pokemon:sv08.5-156:holo']) {
    await page.evaluate(async id => await window.__holo.gallery.close(id), id);
    for (const [name, light, yaw, pitch] of [
      ['front','Studio',0,0], ['grazing','Holo skim',55,-15], ['moving','Moving light',-15,-15],
      ['tilt','Studio',-28,24], ['dark','Low key',-15,-15], ['specular','Strip',-15,-15],
    ]) {
      await page.evaluate(([l,y,p]) => { window.__holo.lighting.setPreset(l); window.__holo.pose(y,p,0); }, [light,yaw,pitch]);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${out}/${id.replaceAll(':','-')}-${name}.png` });
    }
    results.viewers.push({ id, stats: await page.evaluate(() => window.__holo.stats()) });
  }
  await page.evaluate(() => window.__holo.lighting.setPreset('Studio'));
  for (const [sid, name] of products) {
    await page.evaluate(() => window.__holo.pack.browse());
    await page.getByRole('button', { name: /^Pokémon/ }).click();
    await page.getByRole('button', { name: /^Black & White/ }).click();
    await page.locator('button').filter({ has: page.getByText(name, { exact: true }) }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('.pokemon-booster img')].every(img => img.complete && img.naturalWidth > 0));
    await page.screenshot({ path: `${out}/${sid}-picker.png` });
    await page.locator('.pokemon-booster').first().click();
    await page.waitForFunction(() => window.__holo.pack.stats().state === 'PackReady', null, { timeout: 120000 });
    const stats = await page.evaluate(() => window.__holo.pack.stats());
    assert.equal(stats.cardCount, sid === 'bw6-5' ? 5 : 10);
    results.packs.push({ sid, stats, preparation: await page.evaluate(() => window.__holo.opening()) });
    await page.screenshot({ path: `${out}/${sid}-ready.png` });
    await page.evaluate(() => window.__holo.pack.summary());
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${sid}-summary.png` });
    await page.evaluate(() => window.__holo.pack.close());
  }
  results.externalCardRequests = requests.filter(u => /assets\.tcgdex\.net.*\/cards\/|images\.pokemontcg\.io/.test(u));
  assert.deepEqual(results.externalCardRequests, []);
  assert.deepEqual(errors, []);
} catch (error) { results.failure = String(error); process.exitCode = 1; }
finally { await writeFile(`${out}/report.json`, JSON.stringify({ results, errors }, null, 2)); await browser.close(); }
console.log(JSON.stringify({ failure: results.failure, errors, viewers: results.viewers.length, packs: results.packs.length }));
