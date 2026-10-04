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
const out = join(process.cwd(), 'artifacts', `neo-destiny-review${process.env.REVIEW_SUFFIX || ''}`);
await mkdir(out, { recursive: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && response.url().includes('127.0.0.1')) errors.push(`${response.status()} ${response.url()}`); });
try {
  await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
  await page.waitForFunction(()=>window.__holo.gallery.instance()?.openingReady,null,{timeout:90000});
  await page.evaluate(()=>window.__holo.gallery.close('pokemon:neo4-1:holo:first-edition'));
  await page.evaluate(()=>{window.__holo.hideUI();window.__holo.zoom(1.5);});
  const numbers=process.env.REVIEW_NUMBERS?.split(',').map(Number) || [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,106,107,108,109,110,111,112,113];
  for(const n of numbers) for(const edition of ['holo']) {
    await page.evaluate(async id=>{await window.__holo.setCard(id);window.__holo.zoom(.85);},`pokemon:neo4-${n}:holo:first-edition`);
    assert.equal(await page.evaluate(()=>window.__holo.stats().card),`pokemon:neo4-${n}:holo:first-edition`);
    const poses=[['front',0,0,'Studio'],['tilt',-16,-12,'Studio'],['strip',18,9,'Strip']];
    if(process.env.REVIEW_EXTENDED && n===107)poses.push(['dark',12,-8,'Low key'],['grazing',-28,18,'Skim'],['moving',0,0,'Moving light'],['specular',-12,-18,'Strip']);
    for(const [label,yaw,pitch,light] of poses) {
      await page.evaluate(([y,p,l])=>{window.__holo.lighting.setPreset(l);window.__holo.pose(y,p);},[yaw,pitch,light]);
      await page.waitForTimeout(180);
      await page.screenshot({path:join(out,`${n}-${edition}-${label}.png`)});
    }
    console.log(`${n} ${edition} reviewed`);
  }

  for(const n of [17,18,20,30,31,48,60,70,91,92,104,105]){
    await page.evaluate(async id=>{await window.__holo.setCard(id);window.__holo.pose(0,0);},`pokemon:neo4-${n}:normal:first-edition`);
    assert.equal(await page.evaluate(()=>window.__holo.stats().profile),'print-only');
    await page.screenshot({path:join(out,`${n}-normal.png`)});
  }
  const cache=await page.evaluate(async()=>{
    const cpu=window.__holo.cpuPreparation,d=window.__holo.cards.find(c=>c.id==='pokemon:neo4-106:holo:first-edition');
    await cpu.prepare(d,new AbortController().signal);const before=cpu.stats();
    await cpu.prepare(d,new AbortController().signal);return {before,after:cpu.stats()};
  });
  assert.equal(cache.after.hits,cache.before.hits+1);assert.equal(cache.after.misses,cache.before.misses);assert.equal(cache.after.gpuCalls,0);
  assert.deepEqual(errors,[]);
  await writeFile(join(out,'report.json'),JSON.stringify({cards:numbers,poses:3,extraCharizardPoses:process.env.REVIEW_EXTENDED?4:0,nonHolos:12,cache,errors},null,2));
} finally {await browser.close();}
