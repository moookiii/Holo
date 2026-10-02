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
const out = join(process.cwd(), 'artifacts', `ancient-mew-review${process.env.REVIEW_SUFFIX || ''}`);
await mkdir(out, { recursive: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && response.url().includes('127.0.0.1')) errors.push(`${response.status()} ${response.url()}`); });
try {
  await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
  await page.evaluate(()=>{window.__holo.hideUI();window.__holo.zoom(1.5);});
  const numbers=[1];
  for(const n of numbers) for(const edition of ['first-edition']) {
    await page.evaluate(async id=>{await window.__holo.setCard(id);window.__holo.zoom(.85);},'ancient-mew');
    assert.equal(await page.evaluate(()=>window.__holo.stats().card),'ancient-mew');
    for(const [label,yaw,pitch,light] of [['front',0,0,'Studio'],['left',-24,-12,'Studio'],['right',24,12,'Studio'],['strip',18,9,'Strip'],['grazing',-38,18,'Studio']]) {
      await page.evaluate(([y,p,l])=>{window.__holo.lighting.setPreset(l);window.__holo.pose(y,p);},[yaw,pitch,light]);
      await page.waitForTimeout(180);
      await page.screenshot({path:join(out,`${n}-${edition}-${label}.png`)});
    }
    console.log(`${n} ${edition} reviewed`);
  }
  for(let frame=0;frame<30;frame++) {
    await page.evaluate(t=>window.__holo.pose(Math.sin(t)*32,Math.cos(t)*15),frame/29*Math.PI*2);
    await page.waitForTimeout(45);
    await page.screenshot({path:join(out,`motion-${String(frame).padStart(2,'0')}.png`)});
  }
  assert.deepEqual(errors,[]);
  const backend=await page.evaluate(()=>window.__holo.stats().backend);
  await writeFile(join(out,'report.json'),JSON.stringify({backend,cards:numbers,poses:5,errors},null,2));
  console.log(backend);
} finally {await browser.close();}
