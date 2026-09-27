import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const v of (await readdir(root)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const p = join(root, v, 'chrome-win64', 'chrome.exe');
    if (existsSync(p)) { executablePath = p; break; }
  }
}
const backend = process.env.HOLO_BACKEND || 'webgl';
const out = `artifacts/jungle-holo/${backend}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 850, height: 1050 } });
const errors = [], report = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  const cards = await page.evaluate(() => {
    const h=window.__holo;
    const profile=h.profiles.find(p=>p.id==='pokemon-base-set-star');
    if(profile?.name!=='Star Holo: Base Set') throw new Error('Missing named material');
    return h.cards.filter(c=>c.pokemon?.setId==='base2' && c.profile==='pokemon-base-set-star').map(c=>({id:c.id,number:c.number,title:c.title}));
  });
  assert.equal(cards.length,16);
  await page.evaluate(()=>window.__holo.hideUI());
  for(const card of cards.filter(c => !process.env.JUNGLE_CARD || c.id === `pokemon:base2-${process.env.JUNGLE_CARD}:holo`)) {
    await page.evaluate(async id=>{await window.__holo.setCard(id);window.__holo.pose(0,0);},card.id);
    const stats=await page.evaluate(()=>window.__holo.stats());
    assert.equal(stats.profile,'pokemon-base-set-star');
    for(const [name,yaw,pitch] of [['front',0,0],['left',-14,8],['right',14,-8]]) {
      await page.evaluate(([y,p])=>window.__holo.pose(y,p),[yaw,pitch]);
      await page.waitForTimeout(220);
      await page.screenshot({path:`${out}/${card.id.replaceAll(':','-')}-${name}.png`});
    }
    if(process.env.BASE_REVIEW) {
      for(const light of ['Strip','Soft','Low key']) {
        await page.evaluate(value=>window.__holo.lighting.setPreset(value),light);
        for(const [name,yaw,pitch] of [['front',0,0],['left',-14,8],['right',14,-8]]) {
          await page.evaluate(([y,p])=>window.__holo.pose(y,p),[yaw,pitch]);
          await page.waitForTimeout(220);
          await page.screenshot({path:`${out}/${card.id.replaceAll(':','-')}-${light.replace(' ','-')}-${name}.png`});
        }
      }
      await page.evaluate(()=>window.__holo.lighting.setPreset('Studio'));
    }
    // Compare identical poses with only optical mechanisms changed. The existing
    // coverage textures stay in place throughout; this test never writes masks.
    await page.evaluate(()=>window.__holo.pose(0,0)); await page.waitForTimeout(220);
    const lit=await page.screenshot(); await page.waitForTimeout(220);
    const still=await page.screenshot();
    await page.evaluate(()=>{const u=window.__holo.material().optics;u.strength.value=0;u.glintStrength.value=0;u.foilReflectance.value=0;u.sheen.value=0;u.neutralGain.value=0;});
    await page.waitForTimeout(220); const dark=await page.screenshot();
    const difference=await page.evaluate(async ([a,b,c])=>{
      const decode=async data=>{const im=new Image();im.src=`data:image/png;base64,${data}`;await im.decode();const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const ctx=cv.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(0,0,cv.width,cv.height).data;};
      const [x,y,z]=await Promise.all([a,b,c].map(decode));let moving=0,stationary=0;
      for(let i=0;i<x.length;i+=4){if(Math.max(...[0,1,2].map(k=>Math.abs(x[i+k]-y[i+k])))>2)stationary++;if(Math.max(...[0,1,2].map(k=>Math.abs(y[i+k]-z[i+k])))>3)moving++;}
      return {stationary,opticalPixels:moving};
    },[lit,still,dark].map(b=>b.toString('base64')));
    assert.ok(difference.stationary<60,`${card.title}: foil must be fixed at rest`);
    assert.ok(difference.opticalPixels>250,`${card.title}: material must contribute live reflection`);
    report.push({...card,...difference});console.log(card.title,JSON.stringify(difference));
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/report.json`,JSON.stringify({report,errors},null,2));
} finally {await browser.close();}
