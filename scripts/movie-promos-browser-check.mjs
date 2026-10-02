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
const out = join(process.cwd(), 'artifacts', 'movie-promos');
await mkdir(out, { recursive: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && response.url().includes('127.0.0.1')) errors.push(`${response.status()} ${response.url()}`); });
// Stub remote discovery only; local promo assets and renderer run normally.
await page.route('https://api.tcgdex.net/v2/en/series', route => route.fulfill({ json: [{ id: 'base', name: 'Base' }] }));
await page.route('https://api.tcgdex.net/v2/en/series/base', route => route.fulfill({ json: { id:'base',name:'Base',sets:[] } }));
try {
 await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/?backend=webgl');
 await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:60000});
 const results=[];
 for (const n of [2,3,4,5]) {
  await page.evaluate(async n=>{await window.__holo.setCard(`pokemon:basep-${n}:normal`);window.__holo.pose(0,0);},n);
  await page.waitForTimeout(700);
  await page.screenshot({path:`artifacts/movie-promos/${n}-render.png`});
  results.push(await page.evaluate(()=>window.__holo.stats()));
 }
 for(const yaw of [-20,20]) {
  await page.evaluate(async yaw=>{await window.__holo.setCard('pokemon:basep-4:normal');window.__holo.pose(yaw,8);},yaw);
  await page.waitForTimeout(500);
  await page.screenshot({path:`artifacts/movie-promos/4-angle-${yaw}.png`});
 }
 await page.evaluate(()=>window.__holo.pack.browse());
 await page.getByRole('button',{name:/Pokémon/}).click();
 await page.getByRole('button',{name:/^Base$/}).click();
 await page.getByRole('button',{name:/^Wizards Black Star Promos/}).click();
 await page.getByRole('button',{name:/#4 · Pikachu/}).waitFor();
 assert.equal(await page.locator('.pokemon-promo-card').count(),38);
 await page.getByRole('button',{name:/#4 · Pikachu/}).click();
 await page.waitForFunction(()=>window.__holo.stats().card==='pokemon:basep-4:normal');
 console.log(JSON.stringify({errors,results},null,2));
 assert.deepEqual(errors,[]);
} finally { await browser.close(); }
