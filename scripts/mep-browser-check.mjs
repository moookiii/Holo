import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir,readdir,writeFile,readFile } from 'node:fs/promises';
import { join } from 'node:path';
let executablePath=chromium.executablePath();
if(!existsSync(executablePath)) for(const version of (await readdir(join(process.env.LOCALAPPDATA,'ms-playwright'))).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse()) {
  const path=join(process.env.LOCALAPPDATA,'ms-playwright',version,'chrome-win64/chrome.exe');if(existsSync(path)){executablePath=path;break;}
}
const out='artifacts/mep/live-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[],results={cards:[],passed:false};
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&r.url().includes('/tcgl-me/mep/'))errors.push(`${r.status()} ${r.url()}`);});
await page.route('https://api.tcgdex.net/v2/en/series',r=>r.fulfill({json:[{id:'me',name:'Mega Evolution'}]}));
await page.route('https://api.tcgdex.net/v2/en/series/me',r=>r.fulfill({json:{id:'me',name:'Mega Evolution',sets:[]}}));
try {
  await page.goto(process.env.HOLO_URL??'http://127.0.0.1:5174/',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__holo?.ready&&window.__holo.startupTiming.galleryUIAvailable!==undefined,null,{timeout:120000});
  await page.evaluate(()=>window.__holo.pack.browse());
  await page.getByRole('button',{name:/^Pokémon/}).click();
  await page.getByRole('button',{name:/^Mega Evolution/}).click();
  await page.waitForTimeout(700);
  await page.screenshot({path:out+'/sets.png'});
  await page.getByRole('button',{name:/^MEP Black Star Promos/}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.pokemon-promo-card').length===100,null,{timeout:60000});
  results.promoButtons=await page.locator('.pokemon-promo-card').count();
  await page.locator('.pokemon-promo-card img').evaluateAll(images=>Promise.all(images.slice(0,12).map(image=>image.decode())));
  await page.waitForTimeout(300);
  await page.screenshot({path:out+'/promos.png'});
  await page.locator('[data-card-id="mep-011"]').click();
  await page.waitForFunction(()=>window.__holo.stats().card==='pokemon:mep-011:holo',null,{timeout:90000});
  const manifest=JSON.parse(await readFile('public/cards/pokemon/tcgl-me/mep/tcgl/manifest.json','utf8'));
  const ids=[...manifest.filter(s=>s.textured).map(s=>s.cardId),'mep-001','mep-009','mep-005','mep-028','mep-099','mep-100','sv08.5-155','sv08.5-156'];
  for(const id of process.argv.includes('--picker-only')?[]:ids){
    await page.evaluate(id=>window.__holo.gallery.close(`pokemon:${id}:holo`),id);
    await page.waitForFunction(id=>window.__holo.stats().card===`pokemon:${id}:holo`,id,{timeout:90000});
    await page.evaluate(()=>window.__holo.lighting.setPreset('Studio'));
    for(const [name,y,p] of [['front',0,0],['grazing',55,-15],['specular',-15,-15],['tilt',-28,24]]){
      await page.evaluate(([y,p])=>window.__holo.pose(y,p,0),[y,p]);await page.waitForTimeout(180);
      await page.screenshot({path:`${out}/${id}-${name}.png`});
    }
    if(['mep-011','mep-024','mep-032','sv08.5-155','sv08.5-156'].includes(id)) for(const preset of ['Low key','Moving light','Skim']){
      await page.evaluate(p=>{window.__holo.pose(0,0,0);window.__holo.lighting.setPreset(p);},preset);
      for(const phase of [0,1]){await page.waitForTimeout(500);await page.screenshot({path:`${out}/${id}-${preset.replaceAll(' ','-')}-${phase}.png`});}
    }
    results.cards.push({id,stats:await page.evaluate(()=>window.__holo.stats())});
    console.log('Reviewed '+id);
  }
  await page.evaluate(()=>window.__holo.gallery.open());
  await page.getByRole('combobox',{name:'Set',exact:true}).selectOption({label:'MEP Black Star Promos'});
  await page.waitForFunction(()=>{const s=window.__holo.gallery.stats();return s?.visibleExpected>0&&s.visible>=s.visibleExpected;},null,{timeout:90000});
  await page.screenshot({path:out+'/gallery.png'});
  assert.deepEqual(errors,[]);results.passed=true;
}catch(error){results.failure=String(error);process.exitCode=1;await page.screenshot({path:out+'/failure.png'});}
finally{await writeFile(out+(process.argv.includes('--picker-only')?'/picker-report.json':'/report.json'),JSON.stringify({...results,errors},null,2));await browser.close();}
console.log(JSON.stringify({passed:results.passed,cards:results.cards.length,failure:results.failure,errors}));
