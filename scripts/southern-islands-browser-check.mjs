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
const out = join(process.cwd(), 'artifacts', `southern-islands-review${process.env.REVIEW_SUFFIX || ''}`);
await mkdir(out, { recursive: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && response.url().includes('127.0.0.1')) errors.push(`${response.status()} ${response.url()}`); });
try {
  await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
  await page.waitForFunction(()=>window.__holo.gallery.instance()?.openingReady,null,{timeout:90000});
  await page.evaluate(()=>window.__holo.gallery.close('pokemon:si1-1:reverse'));
  await page.evaluate(()=>{window.__holo.hideUI();window.__holo.zoom(1.5);});
  const numbers=process.env.REVIEW_NUMBERS?.split(',').map(Number) || [1,4,7,11,14,17];
  for(const n of numbers) for(const edition of ['reverse']) {
    await page.evaluate(async id=>{await window.__holo.setCard(id);window.__holo.zoom(.85);},`pokemon:si1-${n}:reverse`);
    assert.equal(await page.evaluate(()=>window.__holo.stats().card),`pokemon:si1-${n}:reverse`);
    for(const [label,yaw,pitch,light] of [['front',0,0,'Studio'],['tilt',-16,-12,'Studio'],['strip',18,9,'Strip']]) {
      await page.evaluate(([y,p,l])=>{window.__holo.lighting.setPreset(l);window.__holo.pose(y,p);},[yaw,pitch,light]);
      await page.waitForTimeout(180);
      await page.screenshot({path:join(out,`${n}-${edition}-${label}.png`)});
    }
    console.log(`${n} ${edition} reviewed`);
  }

  for(const n of [2,3,5,6,8,9,10,12,13,15,16,18]){
    await page.evaluate(async id=>{await window.__holo.setCard(id);window.__holo.pose(0,0);},`pokemon:si1-${n}:normal`);
    assert.equal(await page.evaluate(()=>window.__holo.stats().profile),'print-only');
    await page.screenshot({path:join(out,`${n}-normal.png`)});
  }
  await page.evaluate(()=>window.__holo.hideUI());
  await page.route('https://api.tcgdex.net/v2/en/series',r=>r.fulfill({json:[{id:'neo',name:'Neo'}]}));
  await page.route('https://api.tcgdex.net/v2/en/series/neo',r=>r.fulfill({json:{id:'neo',name:'Neo',sets:[{id:'si1',name:'Southern Islands'}]}}));
  const orders=[];
  for(let i=0;i<2;i++){
    await page.evaluate(()=>window.__holo.pack.browse());
    await page.getByRole('button',{name:/Pokémon/}).click();
    await page.getByRole('button',{name:/^Neo$/}).click();
    await page.getByRole('button',{name:/^Southern Islands Collection available/}).click();
    await page.getByRole('button',{name:/^Open collection folder/}).waitFor();
    assert.equal(await page.locator('.pokemon-booster').count(),0);
    await page.screenshot({path:join(out,'folder.png')});
    await page.getByRole('button',{name:/^Open collection folder/}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.pokemon-collection-card').length===18);
    orders.push(await page.locator('.pokemon-collection-card').evaluateAll(buttons=>buttons.map(b=>b.dataset.cardId)));
    await page.screenshot({path:join(out,'open-collection.png')});
    const n=i===0?1:2,variant=i===0?'reverse':'normal';
    await page.locator(`[data-card-id="si1-${n}"]`).click();
    await page.waitForFunction(id=>window.__holo.stats().card===id,`pokemon:si1-${n}:${variant}`,{timeout:90000});
    assert.equal(await page.evaluate(()=>window.__holo.pack.stats().state),'Closed');
    assert.equal(await page.evaluate(()=>window.__holo.stats().profile),i===0?'pokemon-base-set-2-cosmos':'print-only');
  }
  assert.deepEqual(orders[0],orders[1]);
  assert.deepEqual(orders[0],Array.from({length:18},(_,i)=>`si1-${i+1}`));
  const cache=await page.evaluate(async()=>{
    const cpu=window.__holo.cpuPreparation,d=window.__holo.cards.find(c=>c.id==='pokemon:si1-1:reverse');
    await cpu.prepare(d,new AbortController().signal);const before=cpu.stats();
    await cpu.prepare(d,new AbortController().signal);return {before,after:cpu.stats()};
  });
  assert.equal(cache.after.hits,cache.before.hits+1);assert.equal(cache.after.misses,cache.before.misses);assert.equal(cache.after.gpuCalls,0);
  assert.deepEqual(errors,[]);
  const backend=await page.evaluate(()=>window.__holo.stats().backend);
  await writeFile(join(out,'report.json'),JSON.stringify({backend,cards:numbers,poses:3,nonHolos:12,orders,cache,errors},null,2));
  console.log(backend);
} finally {await browser.close();}
