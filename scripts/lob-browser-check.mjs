import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
let executablePath=process.env.BROWSER_EXECUTABLE||chromium.executablePath();
if(!existsSync(executablePath))for(const version of (await readdir(join(process.env.LOCALAPPDATA,'ms-playwright'))).filter(v=>/^chromium-\d+$/.test(v)).sort().reverse()){
  const path=join(process.env.LOCALAPPDATA,'ms-playwright',version,'chrome-win64','chrome.exe');if(existsSync(path)){executablePath=path;break;}
}
const out='artifacts/lob-browser';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.stack));page.on('request',r=>requests.push(r.url()));
const snapshot=JSON.parse(await readFile('public/catalog/yugioh/sets.json','utf8'));
await page.route('https://db.ygoprodeck.com/api/v7/cardsets.php',route=>route.fulfill({json:snapshot.records}));
try{
  await page.goto(`${process.env.HOLO_URL || 'http://127.0.0.1:5174'}/?lab`);await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:120000});
  await page.evaluate(()=>window.__holo.pack.browse());
  await page.getByRole('button',{name:'Yu-Gi-Oh!',exact:false}).click();
  await page.getByLabel('Search Yu-Gi-Oh! sets').waitFor();
  assert.ok(await page.locator('.yugioh-set').count()<=36);
  assert.equal(requests.filter(u=>/lob-first-edition.*\.(jpg|png)/.test(u)).length,0,'catalog loads no card images');
  await page.screenshot({path:`${out}/catalog.png`});
  await page.getByLabel('Format',{exact:true}).selectOption('OCG');assert.equal(await page.locator('.yugioh-set').count(),0);
  await page.getByLabel('Format',{exact:true}).selectOption('TCG');
  await page.getByLabel('Search Yu-Gi-Oh! sets').fill('Metal Raiders');
  await page.locator('.yugioh-set').first().click();assert.ok(await page.getByRole('button',{name:'Open Pack — not implemented'}).isDisabled());
  await page.screenshot({path:`${out}/browse-only.png`});
  await page.getByRole('button',{name:'← Back',exact:true}).click();
  await page.getByLabel('Search Yu-Gi-Oh! sets').fill('LOB');
  await page.locator('.yugioh-set').filter({hasText:'Legend of Blue Eyes White Dragon'}).first().click();
  await page.screenshot({path:`${out}/lob-product.png`});
  await page.getByRole('button',{name:'Open LOB · 2002 NA · 1st Edition'}).click();
  await page.waitForFunction(()=>window.__holo.pack.stats().state==='PackReady',null,{timeout:120000});
  const stats=await page.evaluate(()=>window.__holo.pack.stats());assert.equal(stats.meshIds.length,9);
  await page.screenshot({path:`${out}/pack.png`});
  await page.evaluate(()=>{window.__holo.pack.setStage('summary');});
  await page.waitForTimeout(1500);await page.screenshot({path:`${out}/summary.png`});
  await page.evaluate(()=>window.__holo.pack.close());
  await page.evaluate(()=>window.__holo.pack.browse());
  await page.getByRole('button',{name:'Archive',exact:false}).click();assert.ok(await page.locator('.pokemon-pack-tile').count()>=3);
  await page.getByRole('button',{name:'← Back',exact:true}).click();
  await page.getByRole('button',{name:'Pokémon',exact:false}).click();await page.waitForFunction(()=>document.querySelector('.pokemon-browser h2')?.textContent==='Pokémon series');
  await page.waitForTimeout(1500);await page.screenshot({path:`${out}/pokemon.png`});
  assert.equal(errors.length,0,errors.join('\n'));
  await writeFile(`${out}/report.json`,JSON.stringify({stats,errors,cardFronts:[...new Set(requests.filter(u=>/lob-first-edition\/LOB-\d+\.jpg/.test(u)))],totalRequests:requests.length},null,2));
  console.log('LOB browser + exact 9-card WebGPU pack passed');
}finally{await browser.close();}
