import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
let executablePath=chromium.executablePath();
if(!existsSync(executablePath)) for(const n of (await readdir(join(process.env.LOCALAPPDATA,'ms-playwright'))).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse()) { const p=join(process.env.LOCALAPPDATA,'ms-playwright',n,'chrome-win64/chrome.exe'); if(existsSync(p)){executablePath=p;break;} }
const out=`artifacts/bw-glitter/${process.env.REVIEW_PHASE??'after'}`;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1100,height:1100}}), errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
try {
 
 await page.goto(`${process.env.HOLO_URL ?? 'http://127.0.0.1:5173/'}?benchmark-cold-viewer`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:120000});
 console.log('ready');
 await page.waitForFunction(()=>window.__holo.gallery.stats()?.active && window.__holo.gallery.instance()?.openingReady,null,{timeout:120000});
 await page.evaluate(async()=>{const h=window.__holo;await h.gallery.close('pokemon:bw11r-7:holo');h.hideUI();h.setMode('rotate');h.motion.precise=true;h.zoom(.9);h.lighting.playing=false;});
 const state=await page.evaluate(()=>{const m=window.__holo.material();return {flake:m.optics.foilFlakes,scale:m.optics.glintScale.value,secondary:m.secondaryOptics.glintScale.value,normal:m.surfaceControls.normalScale.value,emboss:m.surfaceControls.embossStrength.value};});
 assert.deepEqual(state,{flake:true,scale:58,secondary:49,normal:0,emboss:0});
 console.log('Updated Pikachu glitter realized');
 for(const [name,light,yaw,pitch,azimuth] of [['front','Studio',0,0,0],['tilt','Studio',-16,12,0],['grazing','Holo skim',45,-15,0],['dark','Low key',-15,-15,0],['specular','Strip',-15,-15,0],['moving-left','Moving light',0,0,-32],['moving-center','Moving light',0,0,0],['moving-right','Moving light',0,0,32]]) {
 await page.evaluate(([l,y,p,a])=>{const h=window.__holo;h.lighting.setPreset(l);h.lighting.playing=false;h.lighting.azimuth=a;h.lighting.update(0);h.pose(y,p,0);},[light,yaw,pitch,azimuth]);
 await page.waitForTimeout(400);await page.screenshot({path:`${out}/${name}.png`});console.log(name);
 }
 for(const n of [1,24]) {
 const id=`pokemon:bw11r-${n}:${n===1?'normal':'holo'}`;
 await page.evaluate(async id=>{const h=window.__holo;await h.setCard(id);h.lighting.setPreset('Studio');h.lighting.playing=false;h.pose(-16,12,0);},id);
 await page.waitForTimeout(400);await page.screenshot({path:`${out}/RC${n}-tilt.png`});
 assert.equal(await page.evaluate(()=>!!window.__holo.material().optics.foilFlakes),n!==1);
 }
 await page.evaluate(async()=>{await window.__holo.gallery.open();});
 await page.getByLabel('Set',{exact:true}).selectOption('Legendary Treasures Radiant Collection');
 await page.getByLabel('Search gallery cards').fill('Pikachu');
 await page.waitForFunction(()=>{const s=window.__holo.gallery.stats();return s?.visible===1&&s.pending===0&&s.visibleFailed===0;},null,{timeout:120000});
 await page.waitForTimeout(400);await page.screenshot({path:`${out}/gallery-Pikachu.png`});
 await writeFile(`${out}/report.json`,JSON.stringify({errors,pikachu:state,stats:await page.evaluate(()=>window.__holo.stats())},null,2));
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
