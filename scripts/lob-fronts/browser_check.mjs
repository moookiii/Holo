/** Live viewer QA of local front decoding, provenance labels and registration. */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
let executablePath=process.env.BROWSER_EXECUTABLE||chromium.executablePath();
if(!existsSync(executablePath))for(const version of (await readdir(join(process.env.LOCALAPPDATA,'ms-playwright'))).filter(v=>/^chromium-\d+$/.test(v)).sort().reverse()){
  const path=join(process.env.LOCALAPPDATA,'ms-playwright',version,'chrome-win64','chrome.exe');if(existsSync(path)){executablePath=path;break;}
}
const out='artifacts/lob-fronts/viewer';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],remoteImages=[];
page.on('pageerror',e=>errors.push(e.stack));
page.on('request',r=>{if(r.resourceType()==='image'&&!new URL(r.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))remoteImages.push(r.url());});
try{
  await page.goto(`${process.env.HOLO_URL||'http://127.0.0.1:5174'}/?lab`);
  await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:120000});
  const decoded=await page.evaluate(async()=>{
    const {lobCards}=await import('/src/yugioh/sets/LegendOfBlueEyesCatalog.ts');
    const sizes=[];
    for(const card of lobCards){const img=new Image();img.src=card.front;await img.decode();sizes.push({number:card.number,path:card.front,width:img.naturalWidth,height:img.naturalHeight});}
    return sizes;
  });
  assert.equal(decoded.length,126);
  await page.addStyleTag({content:'.hl-shell,#ui {visibility:hidden!important}'});
  const samples=['LOB-002','LOB-019','LOB-027','LOB-065','LOB-078','LOB-110','LOB-116','LOB-119','LOB-123','LOB-042'];
  for(const number of samples){
    const label=await page.evaluate(async number=>{
      const {lobCards}=await import('/src/yugioh/sets/LegendOfBlueEyesCatalog.ts');
      const {yugiohDefinition}=await import('/src/yugioh/materials.ts');
      const definition=yugiohDefinition(lobCards.find(c=>c.number===number));
      if(!window.__holo.cards.some(c=>c.id===definition.id))window.__holo.cards.push(definition);
      await window.__holo.setCard(definition.id);return definition.set;
    },number);
    assert.equal(label.includes('Image fallback'),number!=='LOB-123');
    for(const [yaw,pitch] of [[0,0],[-20,8],[15,-8]]){
      await page.evaluate(([yaw,pitch])=>window.__holo.pose(yaw,pitch),[yaw,pitch]);
      await page.waitForTimeout(700);await page.screenshot({path:`${out}/${number}-${yaw}.png`});
    }
  }
  assert.deepEqual(errors,[]);assert.deepEqual(remoteImages,[]);
  await writeFile(`${out}/report.json`,JSON.stringify({decoded,samples,errors,remoteImages,backend:await page.evaluate(()=>window.__holo.stats().backend)},null,2));
  console.log(`126 local fronts decoded; ${samples.length} viewer samples at 3 angles; no remote image requests or page errors.`);
}finally{await browser.close();}
