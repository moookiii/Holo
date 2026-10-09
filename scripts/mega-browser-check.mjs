import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir,readdir,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
let executablePath=chromium.executablePath();
if(!existsSync(executablePath)) for(const version of (await readdir(join(process.env.LOCALAPPDATA,'ms-playwright'))).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse()) {
  const path=join(process.env.LOCALAPPDATA,'ms-playwright',version,'chrome-win64/chrome.exe');if(existsSync(path)){executablePath=path;break;}
}
const full=process.argv.includes('--full');
const out=`artifacts/mega-series/${full?'integration':'vertical-slice'}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[],requests=[],results={viewers:[],packs:[]};
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
page.on('response',r=>{if(r.status()>=400&&r.url().includes('127.0.0.1')) errors.push(`${r.status()} ${r.url()}`);});
await page.route('https://api.tcgdex.net/v2/en/series',r=>r.fulfill({json:[{id:'me',name:'Mega Evolution'}]}));
await page.route('https://api.tcgdex.net/v2/en/series/me',r=>r.fulfill({json:{id:'me',name:'Mega Evolution',sets:[]}}));
try {
  await page.goto(process.env.HOLO_URL??'http://127.0.0.1:5174/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:120000});
  const ids=full?['pokemon:me02-125:holo','pokemon:me02.5-022:holo','pokemon:me03-001:reverse','pokemon:me04-001:normal','pokemon:me05-001:normal']:
    ['pokemon:me01-010:holo','pokemon:me01-001:reverse','pokemon:me02.5-001:special-reverse','pokemon:me01-003:holo','pokemon:me01-133:holo','pokemon:me01-155:holo','pokemon:me01-177:holo','pokemon:me01-187:holo','pokemon:sv08.5-155:holo','pokemon:sv08.5-156:holo'];
  for(const id of ids){
    await page.evaluate(id=>window.__holo.gallery.close(id),id);
    await page.waitForFunction(id=>window.__holo.stats().card===id,id,{timeout:90000}).catch(async()=>{
      assert.equal(await page.evaluate(()=>window.__holo.stats().card),id);
    });
    for(const [name,y,p] of [['front',0,0],['grazing',55,-15],['specular',-15,-15],['tilt',-28,24]]){
      await page.evaluate(([y,p])=>window.__holo.pose(y,p,0),[y,p]);await page.waitForTimeout(220);
      await page.screenshot({path:`${out}/${id.replaceAll(':','-')}-${name}.png`});
    }
    results.viewers.push(await page.evaluate(()=>window.__holo.stats()));
  }
  await page.evaluate(()=>window.__holo.gallery.open());
  await page.getByRole('combobox',{name:'Set',exact:true}).selectOption({label:'Mega Evolution'});
  await page.waitForFunction(()=>window.__holo.gallery.stats()?.visible>0,null,{timeout:120000});
  await page.screenshot({path:out+'/gallery.png'});
  await page.evaluate(()=>window.__holo.gallery.close('pokemon:me01-010:holo'));
  for(const name of full?['Mega Evolution','Phantasmal Flames','Ascended Heroes','Perfect Order','Chaos Rising','Pitch Black']:['Mega Evolution']){
    await page.evaluate(()=>window.__holo.pack.browse());
    await page.getByRole('button',{name:/^Pokémon/}).click();
    await page.getByRole('button',{name:/^Mega Evolution/}).click();
    await page.locator('button').filter({has:page.getByText(name,{exact:true})}).click();
    await page.screenshot({path:`${out}/${name.replaceAll(' ','-')}-picker.png`});
    await page.getByRole('button',{name:/^English booster/}).first().click();
    await page.waitForFunction(()=>window.__holo.pack.stats().state==='PackReady',null,{timeout:120000});
    const stats=await page.evaluate(()=>window.__holo.pack.stats());assert.equal(stats.cardCount,11);
    results.packs.push({name,stats,preparation:await page.evaluate(()=>window.__holo.stats())});
    await page.screenshot({path:`${out}/${name.replaceAll(' ','-')}-ready.png`});
    await page.evaluate(()=>window.__holo.pack.summary());await page.waitForTimeout(250);
    await page.screenshot({path:`${out}/${name.replaceAll(' ','-')}-summary.png`});
    await page.evaluate(()=>window.__holo.pack.close());
  }
  assert.deepEqual(errors,[]);
  results.passed=true;
}catch(e){results.failure=String(e);results.passed=false;process.exitCode=1;await page.screenshot({path:out+'/failure.png'});}
finally {await writeFile(out+'/report.json',JSON.stringify({...results,errors,cardRequests:requests.filter(u=>u.includes('/tcgl-me/'))},null,2));await browser.close();}
console.log(JSON.stringify({passed:results.passed,failure:results.failure,viewers:results.viewers.length,packs:results.packs.length,errors}));
