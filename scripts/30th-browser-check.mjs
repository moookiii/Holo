import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
let executablePath=chromium.executablePath();
if (!existsSync(executablePath)) {
  const root=join(process.env.LOCALAPPDATA,'ms-playwright');
  for (const version of (await readdir(root)).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse()) {
    const path=join(root,version,'chrome-win64/chrome.exe');
    if (existsSync(path)) { executablePath=path; break; }
  }
}
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const out='artifacts/30th-celebration/browser'; await mkdir(out,{recursive:true});
const errors=[],requests=[],results={};
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>requests.push(r.url()));
page.on('response',r=>{if(r.status()>=400&&r.url().includes('127.0.0.1'))errors.push(`${r.status()} ${r.url()}`);});
// Only external series discovery is fixed; real TCGL catalog, CPU/GPU card
// preparation, wrappers, collators and opening controller remain active.
await page.route('https://api.tcgdex.net/v2/en/series',r=>r.fulfill({json:[{id:'me',name:'Mega Evolution'}]}));
await page.route('https://api.tcgdex.net/v2/en/series/me',r=>r.fulfill({json:{id:'me',name:'Mega Evolution',sets:[{id:'30th',name:'30th Celebration'},{id:'30th-c',name:'Classic Collection'}]}}));
try {
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
  // Close gallery through its normal viewer handoff, rather than changing a
  // hidden viewer behind an unrelated gallery screenshot.
  const ids=['pokemon:30th-001:holo','pokemon:30th-023:holo','pokemon:30th-053:holo','pokemon:30th-129:holo','pokemon:30th-147:holo','pokemon:30th-157:holo','pokemon:30th-classic-001:holo','pokemon:30th-classic-022:holo','pokemon:30th-rgb-r:holo','pokemon:mee-009:holo','pokemon:sv08.5-155:holo','pokemon:sv08.5-156:holo'];
  results.viewer=[];
  for(const id of process.env.PACK_ONLY ? [] : ids) {
    await page.evaluate(id=>window.__holo.gallery.close(id),id);
    for(const [name,yaw,pitch] of [['front',0,0],['grazing',55,-15],['specular',-15,-15]]) {
      await page.evaluate(([y,p])=>window.__holo.pose(y,p,0),[yaw,pitch]);
      await page.waitForTimeout(250);
      await page.screenshot({path:`${out}/${id.replaceAll(':','-')}-${name}.png`});
    }
    results.viewer.push(await page.evaluate(()=>window.__holo.stats()));
  }
  if (!process.env.PACK_ONLY) {
  await page.evaluate(()=>window.__holo.gallery.open());
  await page.getByRole('combobox',{name:'Set',exact:true}).selectOption({label:'30th Celebration'});
  await page.waitForFunction(()=>window.__holo.gallery.stats()?.visible>0,null,{timeout:90000});
  await page.screenshot({path:`${out}/gallery-main.png`});
  results.gallery=await page.evaluate(()=>window.__holo.gallery.stats());
  const favorite=page.locator('[data-card-id="pokemon:30th-001:holo"]');
  await favorite.click({modifiers:['Shift']});
  await page.getByRole('button',{name:'Open Favorites binder',exact:true}).click();
  await page.waitForTimeout(500); await page.screenshot({path:`${out}/favorites-binder.png`});
  // Reload preserves persisted favorites while clearing review GPU leases.
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
  }
  results.packs=[];
  await page.evaluate(()=>window.__holo.gallery.close('pokemon:30th-001:holo'));
  for (const [product,booster,count,vending] of [['30th Celebration','English six-card booster',6,false],['30th Celebration · UPC Classic Collection','UPC three-card Classic Collection booster',3,true]]) {
    await page.evaluate(()=>window.__holo.pack.browse());
    if(vending) {
      await page.getByRole('button',{name:'Vending Machine',exact:true}).click();
      await page.locator('.vm-attract').evaluate(n=>n.click());
      await page.getByRole('combobox',{name:'Series or era'}).selectOption('me');
      await page.locator('.vm-product').filter({hasText:product}).first().click();
      await page.locator('.vm-sheet').waitFor();
      await page.screenshot({path:`${out}/upc-vending.png`});
      await page.getByRole('button',{name:'DISPENSE PACK ↓',exact:true}).click();
    } else {
      await page.getByRole('button',{name:/^Pokémon/}).click();
      await page.getByRole('button',{name:/^Mega Evolution/}).click();
      await page.locator('button').filter({has:page.getByText(product,{exact:true})}).click();
      await page.getByRole('button',{name:new RegExp('^'+booster)}).click();
    }
    await page.waitForFunction(()=>window.__holo.pack.stats().state==='PackReady',null,{timeout:120000});
    const stats=await page.evaluate(()=>window.__holo.pack.stats()); assert.equal(stats.cardCount,count);
    results.packs.push({product,stats,preparation:await page.evaluate(()=>window.__holo.stats())});
    await page.screenshot({path:`${out}/pack-${count}-ready.png`});
    await page.evaluate(()=>window.__holo.pack.summary());
    await page.waitForTimeout(300); await page.screenshot({path:`${out}/pack-${count}-summary.png`});
    await page.evaluate(()=>window.__holo.pack.close());
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.__holo.gallery.close('pokemon:30th-147:holo'));
  await page.screenshot({path:`${out}/mobile-viewer.png`});
  results.localCardRequests=requests.filter(url=>url.includes('/cards/pokemon/30th-celebration/'));
  assert.deepEqual(errors,[]);
} catch(error) { results.failure=String(error); await page.screenshot({path:`${out}/failure.png`}); process.exitCode=1; }
finally { await writeFile(`${out}/report.json`,JSON.stringify({results,errors},null,2)); await browser.close(); }
console.log(JSON.stringify({failure:results.failure,errors,viewers:results.viewer?.length,packs:results.packs?.length}));
