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
  await page.getByRole('button',{name:'2002–2004 · Early TCG'}).click();
  assert.equal(await page.locator('.pokemon-pack-tile').count(),1,'only implemented sets appear');
  assert.equal(await page.locator('dialog select, dialog input').count(),0,'same tile navigation as Pokemon');
  assert.equal(requests.filter(u=>/lob-first-edition\/LOB-.*\.jpg/.test(u)).length,0,'selection loads no card fronts');
  await page.screenshot({path:`${out}/available-sets.png`});
  await page.getByRole('button',{name:'Legend of Blue Eyes White Dragon',exact:false}).click();
  assert.equal(await page.locator('.pokemon-booster').count(),1);
  assert.equal(await page.locator('.pokemon-booster img').evaluate(img=>getComputedStyle(img).height),'310px');
  await page.getByRole('button',{name:'← Back',exact:true}).click();
  await page.getByRole('button',{name:'← Back',exact:true}).click();
  await page.getByRole('button',{name:'2002–2004 · Early TCG'}).click();
  await page.getByRole('button',{name:'Legend of Blue Eyes White Dragon',exact:false}).click();
  await page.screenshot({path:`${out}/lob-product.png`});
  await page.getByRole('button',{name:'1st Edition',exact:true}).click();
  await page.waitForFunction(()=>window.__holo.pack.stats().state==='PackReady',null,{timeout:120000});
  const stats=await page.evaluate(()=>window.__holo.pack.stats());assert.equal(stats.meshIds.length,9);
  await page.screenshot({path:`${out}/pack.png`});
  await page.evaluate(()=>{window.__holo.pack.setStage('summary');});
  await page.waitForTimeout(1500);await page.screenshot({path:`${out}/summary.png`});
  await page.evaluate(()=>{window.__holo.pack.select(8);window.__holo.pack.advance();});
  await page.waitForFunction(()=>window.__holo.pack.stats().state==='Closed'&&window.__holo.stats().card.startsWith('yugioh:lob:'),null,{timeout:15000});
  await page.screenshot({path:`${out}/inspect.png`});
  await page.evaluate(()=>window.__holo.flip());await page.waitForTimeout(1700);await page.screenshot({path:`${out}/flip.png`});
  await page.evaluate(()=>window.__holo.flip());await page.waitForTimeout(1700);
  await page.evaluate(()=>window.__holo.pack.close());
  await page.evaluate(()=>window.__holo.pack.browse());
  await page.getByRole('button',{name:'Archive',exact:false}).click();assert.ok(await page.locator('.pokemon-pack-tile').count()>=3);
  await page.getByRole('button',{name:'← Back',exact:true}).click();
  await page.getByRole('button',{name:'Pokémon',exact:false}).click();await page.waitForFunction(()=>document.querySelector('.pokemon-browser h2')?.textContent==='Pokémon series');
  await page.waitForTimeout(1500);await page.screenshot({path:`${out}/pokemon.png`});
  await page.getByRole('button',{name:'Close',exact:true}).click();
  // Review each historical finish through the same single-card renderer.
  await page.addStyleTag({content:'.hl-shell, #ui { visibility: hidden !important; }'});
  for(const number of ['LOB-002','LOB-027','LOB-007','LOB-001','LOB-000','LOB-125']){
    await page.evaluate(async number=>{
      const {lobCards}=await import('/src/yugioh/sets/LegendOfBlueEyesCatalog.ts');const {yugiohDefinition}=await import('/src/yugioh/materials.ts');
      const definition=yugiohDefinition(lobCards.find(c=>c.number===number));if(!window.__holo.cards.some(c=>c.id===definition.id))window.__holo.cards.push(definition);
      await window.__holo.setCard(definition.id);
    },number);
    for(const [angle,pitch] of [[-20,8],[15,-8]]){await page.evaluate(([a,p])=>window.__holo.pose(a,p),[angle,pitch]);await page.waitForTimeout(700);await page.screenshot({path:`${out}/${number}-${angle}.png`});}
  }
  assert.equal(errors.length,0,errors.join('\n'));
  await writeFile(`${out}/report.json`,JSON.stringify({stats,errors,cardFronts:[...new Set(requests.filter(u=>/lob-first-edition\/LOB-\d+\.jpg/.test(u)))],totalRequests:requests.length},null,2));
  console.log('LOB browser + exact 9-card WebGPU pack passed');
}catch(error){await page.screenshot({path:`${out}/failure.png`});console.error(await page.locator('dialog').innerText().catch(()=>''),errors);throw error;}finally{await browser.close();}
