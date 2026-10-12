import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
let executablePath=chromium.executablePath();
if(!existsSync(executablePath)) {
  const root=join(process.env.LOCALAPPDATA,'ms-playwright');
  for(const name of (await readdir(root)).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse()) {
    const p=join(root,name,'chrome-win64/chrome.exe');if(existsSync(p)){executablePath=p;break;}
  }
}
const out='artifacts/bw-stamps/live';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const errors=[],report=[];
try {
  const page=await browser.newPage({viewport:{width:1100,height:1200}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().includes('127.0.0.1'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('http://127.0.0.1:5173/?benchmark-cold-viewer');
  await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:120000});
  await page.waitForFunction(()=>window.__holo.gallery.stats()?.visible>0,null,{timeout:120000});
  for(const id of ['pokemon:bwbsp-28:holo','pokemon:bwbsp-50:holo','pokemon:bwbsp-95:holo']) {
    // Reference IDs vary by the legacy catalog; select Base Set 2 by profile.
    const actual=id==='pokemon:base2-1:holo' ? await page.evaluate(()=>window.__holo.cards.find(c=>c.profile==='pokemon-base-set-2-cosmos'&&c.pokemon?.seriesId!=='bw')?.id) : id;
    if(!actual)continue;
    await page.evaluate(async id=>{await window.__holo.gallery.close(id);window.__holo.hideUI();window.__holo.lighting.playing=false;},actual);
    const state=await page.evaluate(()=>{const h=window.__holo,m=h.material();return {card:h.stats().card,normal:m.surfaceControls.normalScale.value,emboss:m.surfaceControls.embossStrength.value,glints:m.optics.glintStrength.value};});
    assert.deepEqual([state.normal,state.emboss,state.glints],[0,0,0]);

    for(const [name,light,yaw,pitch] of [['front','Studio',0,0],['grazing','Holo skim',55,-15],['tilt','Studio',-28,24],['dark','Low key',-15,-15],['specular','Strip',-15,-15],['moving','Moving light',-15,-15]]) {
      await page.evaluate(([light,yaw,pitch])=>{const h=window.__holo;h.lighting.setPreset(light);h.lighting.playing=false;h.pose(yaw,pitch,0);},[light,yaw,pitch]);
      await page.waitForTimeout(250);
      await page.screenshot({path:`${out}/${actual.replaceAll(':','-')}-${name}.png`});
    }
    for(const azimuth of [-32,0,32]) {
      await page.evaluate(azimuth=>{const h=window.__holo;h.lighting.setPreset('Moving light');h.lighting.playing=false;h.lighting.azimuth=azimuth;h.lighting.elevation=18;h.lighting.update(0);h.pose(0,0,0);},azimuth);
      await page.waitForTimeout(150);await page.screenshot({path:`${out}/${actual.replaceAll(':','-')}-motion-${azimuth}.png`});
    }
    report.push(state);console.log(actual,'review captured');
  }
  assert.deepEqual(errors,[]);
} finally {await writeFile(`${out}/report.json`,JSON.stringify({cards:report,errors},null,2));await browser.close();}
