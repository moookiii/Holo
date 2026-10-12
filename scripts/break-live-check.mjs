import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) {
 const root=join(process.env.LOCALAPPDATA,'ms-playwright');
 for(const v of (await readdir(root)).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse()) {
  const p=join(root,v,'chrome-win64/chrome.exe'); if(existsSync(p)){executablePath=p;break;}
 }
}
const out='artifacts/break'; await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const results={viewers:[],motion:[],rotation:[],performance:[],gallery:[]};
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try {
 await page.goto(process.env.HOLO_URL || 'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:120000});
 console.log('page loaded');
 await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:120000});
 await page.waitForFunction(()=>window.__holo?.gallery.stats()?.active && window.__holo.gallery.stats()?.visible>0,null,{timeout:120000});
 console.log('gallery ready');
 await page.evaluate(async()=>await window.__holo.gallery.close('pokemon:xy12-46:holo'));
 await page.waitForFunction(()=>window.__holo.stats().card==='pokemon:xy12-46:holo',null,{timeout:120000});
 console.log('Nidoking ready');
 await page.evaluate(()=>{window.__holo.hideUI();window.__holo.lighting.playing=false;window.__holo.pose(0,0,-90);window.__holo.zoom(.8)});
 for(const [name,light,y,p] of [['front','Studio',0,0],['tilt','Studio',-12,8],['skim','Holo skim',22,-12],['dark','Low key',0,0],['strip','Strip',0,0],['moving','Moving light',0,0],['reference','Studio',0,0]]){
  await page.evaluate(([l,y,p])=>{window.__holo.lighting.setPreset(l);window.__holo.pose(y,p,-90)},[light,y,p]);
  if(name==='reference')await page.evaluate(()=>{const l=window.__holo.lighting;l.playing=false;l.key.position.set(6,2,14);l.key.lookAt(0,0,0);l.key.intensity=85;l.key.width=2;l.key.height=3;l.strip.intensity=0;l.fill.intensity=.7;window.__holo.scene.environmentIntensity=.45});
  await page.waitForTimeout(1100);await page.screenshot({path:`${out}/nidoking-${name}.png`});
 }

 // Fixed card and camera, orbiting light: the lattice must stay stationary
 // while rainbow sectors rotate inside each tile.
 for(let i=0;i<32;i++){
  const angle=i*Math.PI*2/32;
  await page.evaluate(a=>{const h=window.__holo,l=h.lighting;h.pose(0,0,-90);l.setPreset('Studio');l.playing=false;l.key.position.set(Math.cos(a)*5,Math.sin(a)*5,14);l.key.lookAt(0,0,0);l.key.width=.7;l.key.height=.7;l.strip.intensity=0},angle);
  await page.waitForTimeout(80);
  const frame=await page.screenshot({path:`${out}/rotation-${String(i).padStart(2,'0')}.png`});
  results.rotation.push({angle,hash:createHash('sha256').update(frame).digest('hex')});
 }
 assert.equal(new Set(results.rotation.map(f=>f.hash)).size,32);
 results.viewers.push({id:'pokemon:xy12-46:holo',stats:await page.evaluate(()=>window.__holo.stats())});
 // Fixed lighting/pose must produce the same image after leaving and returning.
 await page.evaluate(()=>{window.__holo.lighting.setPreset('Studio');window.__holo.pose(0,0,-90)});
 await page.waitForTimeout(500);
 const before=await page.screenshot();
 for(let i=0;i<=24;i++){
  const yaw=-24+i*2;
  await page.evaluate(y=>window.__holo.pose(y,6,-90),yaw);
  await page.waitForTimeout(90);
  const frame=await page.screenshot({path:`${out}/sweep-${String(i).padStart(2,'0')}.png`});
  results.motion.push({yaw,hash:createHash('sha256').update(frame).digest('hex')});
 }
 await page.evaluate(()=>window.__holo.pose(0,0,-90));await page.waitForTimeout(500);
 const after=await page.screenshot();
 results.staticRepeatable=before.equals(after);
 assert.ok(results.staticRepeatable,'same pose/light must return the same pixels');
 assert.equal(new Set(results.motion.map(f=>f.hash)).size,25,'tilt frames must change');
 for(const id of ['pokemon:xy8-92:holo','pokemon:xy8-113:holo','pokemon:xy9-41:holo','pokemon:xy10-14:holo','pokemon:xy11-82:holo','pokemon:xybsp-154:holo']){
  const exists=await page.evaluate(id=>window.__holo.cards.some(c=>c.id===id),id);if(!exists)continue;
  await page.evaluate(async id=>await window.__holo.gallery.close(id),id);
  await page.waitForFunction(id=>window.__holo.stats().card===id,id);
  assert.equal(await page.evaluate(()=>window.__holo.stats().profile),'pokemon-break');
  for(const [name,light,y,p] of [['front','Studio',0,0],['tilt','Studio',-12,8],['skim','Holo skim',24,-12],['dark','Low key',0,0],['strip','Strip',0,0]]){
   await page.evaluate(([l,y,p])=>{window.__holo.lighting.setPreset(l);window.__holo.pose(y,p,-90)},[light,y,p]);
   await page.waitForTimeout(200);await page.screenshot({path:`${out}/${id.replaceAll(':','-')}-${name}.png`});
  }
  results.viewers.push({id,stats:await page.evaluate(()=>window.__holo.stats())});
 }
 await page.evaluate(async()=>await window.__holo.gallery.close('pokemon:xy12-46:holo'));
 await page.evaluate(()=>{window.__holo.lighting.setPreset('Studio');window.__holo.pose(0,0,-90)});
 for(const profile of ['pokemon-break','pokemon-sheen']){
  await page.evaluate(async p=>await window.__holo.setProfile(p),profile);
  await page.waitForTimeout(1200);
  results.performance.push(await page.evaluate(async profile=>{
   const allocationStart=window.__holo.renderer.info.memory.textures;
   const times=[];let last=performance.now();
   for(let i=0;i<180;i++){await new Promise(requestAnimationFrame);const now=performance.now();times.push(now-last);last=now}
   times.sort((a,b)=>a-b);
   return {profile,median:times[90],p95:times[171],textureStart:allocationStart,textureEnd:window.__holo.renderer.info.memory.textures};
  },profile));
 }
 await page.evaluate(async()=>await window.__holo.setProfile('pokemon-break'));
 await page.evaluate(()=>window.__holo.gallery.open());
 await page.getByLabel('Search gallery cards').fill('BREAK');
 await page.getByLabel('Rarity',{exact:true}).selectOption({label:'BREAK Rare'});
 for(const lighting of ['Studio','Moving light','Low key']){
  await page.getByLabel('Gallery lighting').selectOption(lighting);
  await page.waitForFunction(()=>{const s=window.__holo.gallery.stats();return s?.visible>0&&s.visible===s.visibleExpected&&!s.visibleFailed},null,{timeout:120000});
  await page.waitForTimeout(500);
  if(lighting==='Moving light'){
   await page.evaluate(()=>window.__holo.lighting.playing=true);
   const before=await page.screenshot();await page.waitForTimeout(1600);
   const after=await page.screenshot({path:`${out}/gallery-moving-later.png`});
   assert.ok(!before.equals(after),'gallery moving light must change the optical reflection');
   await page.evaluate(()=>window.__holo.lighting.playing=false);
  }
  results.gallery.push({lighting,stats:await page.evaluate(()=>window.__holo.gallery.stats())});
  await page.screenshot({path:`${out}/gallery-${lighting.replaceAll(' ','-')}.png`});
 }
 const card=page.locator('[data-card-id]').first();const box=await card.boundingBox();
 if(box){await page.mouse.move(box.x+box.width*.75,box.y+box.height*.3);await page.waitForTimeout(900);
  assert.ok(await page.evaluate(()=>window.__holo.gallery.stats().tilted>0));
  await page.screenshot({path:`${out}/gallery-hover.png`});await page.mouse.move(0,0);}
 const seen=new Set();
 for(const fraction of [0,.24,.48,.72,1]){
  await page.locator('.gallery-viewport').evaluate((v,f)=>v.scrollTop=(v.scrollHeight-v.clientHeight)*f,fraction);
  await page.waitForTimeout(400);
  await page.waitForFunction(()=>{const s=window.__holo.gallery.stats();return s?.visible>0&&s.visible===s.visibleExpected&&!s.visibleFailed&&!s.pending},null,{timeout:120000});
  for(const id of await page.locator('[data-card-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId)))seen.add(id);
  await page.screenshot({path:`${out}/gallery-scroll-${fraction}.png`});
 }
 results.galleryPrintingsVisited=seen.size;assert.equal(seen.size,35);
 assert.deepEqual(errors,[]);
} catch(error){results.failure=String(error);process.exitCode=1;}
finally{
 await writeFile(`${out}/report.json`,JSON.stringify({results,errors},null,2));
 console.log(JSON.stringify({failure:results.failure,viewers:results.viewers.length,staticRepeatable:results.staticRepeatable,performance:results.performance,gallery:results.gallery.length,errors}));
 await browser.close();
}
