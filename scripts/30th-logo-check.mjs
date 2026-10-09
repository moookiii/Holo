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
const out='artifacts/30th-celebration/logo'; await mkdir(out,{recursive:true});
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
 await page.evaluate(()=>{window.__holo.gallery.close('pokemon:30th-001:holo');window.__holo.pack.browse();});
 await page.getByRole('button',{name:/^Pokémon/}).click();
 await page.getByRole('button',{name:/^Mega Evolution/}).click();
 const tile=page.locator('button').filter({has:page.getByText('30th Celebration',{exact:true})});
 const img=tile.locator('img');
 await img.waitFor();
 await img.evaluate(i=>i.decode());
 assert.ok((await img.getAttribute('src')).includes('/packs/pokemon/30th-logo.png'));
 await tile.screenshot({path:out+'/set-tile.png'});
 assert.deepEqual(errors,[]);
 console.log('Anniversary picker logo loaded and rendered');
} finally {await browser.close();}
