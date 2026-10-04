import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
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
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
const out = join(process.cwd(), 'artifacts', 'neo-destiny-gallery');
await mkdir(out, { recursive: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && response.url().includes('127.0.0.1')) errors.push(`${response.status()} ${response.url()}`); });
try {
  await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
  await page.waitForFunction(()=>window.__holo.gallery.instance()?.openingReady,null,{timeout:90000});
  const set=page.getByRole('combobox',{name:'Set',exact:true});
  const order=await set.locator('option').allTextContents();
  assert.ok(order.indexOf('Neo Revelation')<order.indexOf('Neo Destiny'));
  assert.ok(order.indexOf('Neo Destiny')<order.indexOf('Legendary Collection'));
  await set.selectOption('Neo Destiny');
  await page.waitForFunction(()=>window.__holo.gallery.stats()?.filtered===113);
  await page.waitForFunction(()=>{const s=window.__holo.gallery.stats();return s?.pending===0&&s.visible>0;},null,{timeout:120000});
  const stats=await page.evaluate(()=>({gallery:window.__holo.gallery.stats(),cpu:window.__holo.cpuPreparation.stats()}));
  assert.equal(stats.cpu.gpuCalls,0);
  assert.ok(stats.gallery.domCards<113);
  await page.screenshot({path:join(out,'set-gallery.png')});
  await page.getByRole('searchbox',{name:'Search gallery cards'}).fill('Shining Celebi');
  await page.getByRole('button',{name:/^Open Shining Celebi, Neo Destiny/}).click();
  await page.waitForFunction(()=>window.__holo.stats().card==='pokemon:neo4-106:holo:first-edition',null,{timeout:90000});
  assert.equal(await page.evaluate(()=>window.__holo.stats().profile),'pokemon-team-rocket-trainer');
  await page.screenshot({path:join(out,'shining-viewer.png')});
  assert.deepEqual(errors,[]);
  await writeFile(join(out,'report.json'),JSON.stringify({stats,order,errors},null,2));
} finally {await browser.close();}
