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
const out='artifacts/30th-celebration/shader-routing'; await mkdir(out,{recursive:true});
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
 for (const id of ['pokemon:30th-053:holo','pokemon:30th-129:holo','pokemon:30th-rgb-r:holo']) {
  await page.evaluate(id=>window.__holo.gallery.close(id),id);
  await page.waitForTimeout(800);
  for(const [name,y,p] of [['front',0,0],['grazing',55,-15]]) {
   await page.evaluate(([y,p])=>window.__holo.pose(y,p,0),[y,p]);await page.waitForTimeout(350);
   await page.screenshot({path:out+'/'+id.replaceAll(':','-')+'-'+name+'.png'});
  }
  results[id]=await page.evaluate(()=>({stats:window.__holo.stats(),sunPillar:window.__holo.material().optics.sunPillar,foilControls:!!window.__holo.material().foilControlsTextureNode.value}));
 }
 await page.evaluate(()=>window.__holo.gallery.open());
 await page.getByRole('combobox',{name:'Set',exact:true}).selectOption({label:'30th Celebration'});
 await page.waitForFunction(()=>window.__holo.gallery.stats()?.visible>0,null,{timeout:90000});
 await page.screenshot({path:out+'/gallery.png'});
 results.gallery=await page.evaluate(()=>window.__holo.gallery.stats());
 assert.equal(results['pokemon:30th-053:holo'].sunPillar,true);
 assert.equal(results['pokemon:30th-129:holo'].sunPillar,false);
 assert.deepEqual(errors,[]);
} catch(e) { results.failure=String(e);process.exitCode=1; }
finally { await writeFile(out+'/report.json',JSON.stringify({results,errors},null,2));await browser.close(); }
console.log(JSON.stringify({failure:results.failure,errors}));
