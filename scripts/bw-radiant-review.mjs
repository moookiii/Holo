import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const version of (await readdir(root)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const path = join(root, version, 'chrome-win64/chrome.exe');
    if (existsSync(path)) { executablePath = path; break; }
  }
}
const out = 'artifacts/bw-radiant/live';
await mkdir(out, {recursive:true});
const browser = await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport:{width:1200,height:1100}});
const errors = [], results = [];
const bounded = promise => Promise.race([promise,new Promise((_,reject) => {
  const timer = setTimeout(() => reject(new Error('Card realization exceeded 120 seconds')),120000);timer.unref();
})]);
page.on('pageerror',e => errors.push(e.message));
page.on('response',r => { if(r.status()>=400 && r.url().includes('/bw-radiant/')) errors.push(`${r.status()} ${r.url()}`); });
try {
  await page.goto(process.env.HOLO_URL ?? 'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  console.log('Page loaded');
  await page.waitForFunction(() => window.__holo?.ready,null,{timeout:120000});
  console.log('Renderer ready');
  await page.waitForFunction(() => window.__holo.gallery.stats()?.active && window.__holo.gallery.instance()?.openingReady,null,{timeout:120000});
  await bounded(page.evaluate(async () => {await window.__holo.gallery.close('pokemon:bw11r-1:normal');window.__holo.hideUI();window.__holo.setMode('rotate');window.__holo.motion.precise=true;}));
  console.log('First card ready');
  for (let n=1;n<=25;n++) {
    const variant = [1,2,5,8,9,15,16,17,18,20].includes(n) ? 'normal':'holo';
    const id = `pokemon:bw11r-${n}:${variant}`;
    await bounded(page.evaluate(async id => { await window.__holo.setCard(id);window.__holo.zoom(.85); },id));
    await page.waitForFunction(id => window.__holo.stats().card === id && !window.__holo.gallery.stats()?.active, id, {timeout:120000});
    const poses = [
      ['front','Studio',0,0],['tilt','Studio',-28,24],['specular','Strip',-15,-15],
      ...([1,7,11,24].includes(n) ? [['grazing','Holo skim',55,-15],['dark','Low key',-15,-15],['moving','Moving light',-15,-15]]:[]),
    ];
    for (const [name,light,yaw,pitch] of poses) {
      await page.evaluate(([l,y,p]) => {window.__holo.lighting.setPreset(l);window.__holo.pose(y,p,0);},[light,yaw,pitch]);
      await page.waitForTimeout(160);
      await page.screenshot({path:`${out}/RC${n}-${name}.png`});
    }
    const material = await page.evaluate(() => {const h=window.__holo,m=h.material();return {
      stats:h.stats(), normalScale:m.surfaceControls.normalScale.value, emboss:m.surfaceControls.embossStrength.value,
      primaryScale:m.optics.glintScale.value,secondaryScale:m.secondaryOptics.glintScale.value,
      grain:m.optics.spectralGrain, secondaryGrain:m.secondaryOptics.spectralGrain,
    };});
    assert.equal(material.stats.card,id);
    assert.equal(material.normalScale,0);assert.equal(material.emboss,0);
    if(variant==='holo') {assert.equal(material.grain,true);assert.equal(material.secondaryGrain,true);}
    results.push({id,...material});
    console.log(id,'reviewed');
  }
  await page.evaluate(async () => {await window.__holo.setCard('pokemon:bw11r-24:holo');window.__holo.lighting.setPreset('Studio');window.__holo.pose(-15,-15,0);});
  await page.waitForTimeout(250);
  await page.screenshot({path:`${out}/RC24-glitter-on.png`});
  await page.evaluate(() => {const m=window.__holo.material();m.optics.glintStrength.value=0;m.secondaryOptics.glintStrength.value=0;});
  await page.waitForTimeout(160);
  await page.screenshot({path:`${out}/RC24-glitter-off.png`});
  await page.evaluate(async () => {await window.__holo.gallery.open();});
  await page.getByLabel('Set',{exact:true}).selectOption('Legendary Treasures Radiant Collection');
  for (const name of ['Snivy','Mew']) {
    await page.getByLabel('Search gallery cards').fill(name);
    await page.waitForFunction(() => {const s=window.__holo.gallery.stats();return s?.visible===1 && s.pending===0 && s.visibleFailed===0;},null,{timeout:120000});
    await page.waitForTimeout(250);
    await page.screenshot({path:`${out}/gallery-${name}.png`});
  }
  console.log('Common and glitter gallery previews reviewed');
  assert.deepEqual(errors,[]);
} catch(error) {errors.push(String(error));console.error(error);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});process.exitCode=1;}
finally {await writeFile(`${out}/report.json`,JSON.stringify({errors,results},null,2));await browser.close();}
