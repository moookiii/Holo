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
const out = join(process.cwd(), 'artifacts', `neo-genesis-holo-review${process.env.REVIEW_SUFFIX || ''}`);
await mkdir(out, { recursive: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && response.url().includes('127.0.0.1')) errors.push(`${response.status()} ${response.url()}`); });
try {
  await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
  await page.evaluate(()=>{window.__holo.hideUI();window.__holo.zoom(1.5);});
  const numbers=process.env.REVIEW_NUMBERS?.split(',').map(Number) || Array.from({length:19},(_,i)=>i+1).filter(n=>n!==9);
  for(const n of numbers) for(const edition of ['first-edition']) {
    await page.evaluate(async id=>{await window.__holo.setCard(id);window.__holo.zoom(.85);},`pokemon:neo1-${n}:holo:${edition}`);
    assert.equal(await page.evaluate(()=>window.__holo.stats().card),`pokemon:neo1-${n}:holo:${edition}`);
    for(const [label,yaw,pitch,light] of [['front',0,0,'Studio'],['tilt',-16,-12,'Studio'],['strip',18,9,'Strip']]) {
      await page.evaluate(([y,p,l])=>{window.__holo.lighting.setPreset(l);window.__holo.pose(y,p);},[yaw,pitch,light]);
      await page.waitForTimeout(180);
      await page.screenshot({path:join(out,`${n}-${edition}-${label}.png`)});
    }
    console.log(`${n} ${edition} reviewed`);
  }
  assert.deepEqual(errors,[]);
  const backend=await page.evaluate(()=>window.__holo.stats().backend);
  await writeFile(join(out,'report.json'),JSON.stringify({backend,cards:numbers,poses:3,errors},null,2));
  console.log(backend);
} finally {await browser.close();}
