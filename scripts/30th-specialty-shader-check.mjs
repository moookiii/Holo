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
const out='artifacts/30th-celebration/specialty-calibration'; await mkdir(out,{recursive:true});
const errors=[],requests=[],results={};
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>requests.push(r.url()));
page.on('response',r=>{if(r.status()>=400&&r.url().includes('127.0.0.1'))errors.push(`${r.status()} ${r.url()}`);});
// Only external series discovery is fixed; real TCGL catalog, CPU/GPU card
// preparation, wrappers, collators and opening controller remain active.
await page.route('https://api.tcgdex.net/v2/en/series',r=>r.fulfill({json:[{id:'me',name:'Mega Evolution'}]}));
await page.route('https://api.tcgdex.net/v2/en/series/me',r=>r.fulfill({json:{id:'me',name:'Mega Evolution',sets:[{id:'30th',name:'30th Celebration'},{id:'30th-c',name:'Classic Collection'}]}}));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try {
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
 for(const classic of [false,true]) {
  await page.evaluate(id=>window.__holo.gallery.close(id),classic?'pokemon:30th-classic-001:holo':'pokemon:30th-023:holo');
  await page.waitForTimeout(700);
  await page.evaluate(async classic=>{
   const T=await import('/node_modules/.vite/deps/three_webgpu.js');
   const {celebrationSpecialtyProfiles:profiles}=await import('/src/materials/profiles/celebration.ts');
   const {tcglEtchedFinish:finish}=await import('/src/materials/profiles/tcglEtchedFinish.ts');
   const {getProfile}=await import('/src/materials/profiles/index.ts');
   const {inspection}=await import('/src/lighting/inspection.ts');
   const tex=rgba=>{const t=new T.DataTexture(new Uint8Array(rgba),1,1,T.RGBAFormat);t.needsUpdate=true;return t;};
   // Deliberate test fixture: two optical domains, no claimed card geometry.
   const data=new Uint8Array(64*64*4);
   for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4;data.set(x<32?[255,128,128,255]:[0,128,128,255],i);}
   const field=new T.DataTexture(data,64,64,T.RGBAFormat);field.needsUpdate=true;
   const material=window.__holo.material();
   const originalMaps=material.cardMaps;
   const stock=profiles[classic?1:0];
   const profile=classic?{...getProfile('prismatic_sir_texture'),...finish,secondary:stock}:stock;
   const coverage=tex(classic?[128,200,0,255]:[255,0,0,255]);
   material.setMaps({...originalMaps,coverage,...(classic?{secondaryDirection:field}:{direction:field})});
   material.setProfile(profile);
   inspection.holoSweep.value=1;inspection.sweepDirection.value.set(.4,.1,1).normalize();
   window.__specialtyTest={field,data,inspection,classic};window.__holo.pose(0,0,0);
  },classic);
  await page.waitForTimeout(1000);
  const name=classic?'classic':'pikachu';
  await page.screenshot({path:out+'/'+name+'-lit.png'});
  await page.evaluate(()=>{const {inspection}=window.__specialtyTest;inspection.sweepDirection.value.set(-.3,.6,1).normalize();});
  await page.waitForTimeout(400);await page.screenshot({path:out+'/'+name+'-moving-light.png'});
  await page.evaluate(()=>{const {data,field}=window.__specialtyTest;for(let i=3;i<data.length;i+=4)data[i]=0;field.needsUpdate=true;});
  await page.waitForTimeout(400);await page.screenshot({path:out+'/'+name+'-zero-motif.png'});
  results[name]=await page.evaluate(()=>({backend:window.__holo.stats().backend,primary:window.__holo.material().optics.celebrationPikachu,secondary:window.__holo.material().secondaryOptics.celebrationClassic}));
 }
 assert.deepEqual(errors,[]);
} catch(e){results.failure=String(e);process.exitCode=1;}
finally{await writeFile(out+'/report.json',JSON.stringify({results,errors},null,2));await browser.close();}
console.log(JSON.stringify({results,errors}));
