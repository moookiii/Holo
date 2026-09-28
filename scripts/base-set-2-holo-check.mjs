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
const out = `artifacts/base-set-2-holo/${backend}`;
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
    const profile=h.profiles.find(p=>p.id==='pokemon-base-set-2-cosmos');
    if(profile?.name!=='Cosmos: Base Set 2') throw new Error('Missing named material');
    return h.cards.filter(c=>c.pokemon?.setId==='base4' && c.profile==='pokemon-base-set-2-cosmos').map(c=>({id:c.id,number:c.number,title:c.title}));
  });
  assert.equal(cards.length,20);
  await page.evaluate(()=>window.__holo.hideUI());
  for(const card of cards.filter(c => !process.env.BASE_SET_2_CARD || c.id === `pokemon:base4-${process.env.BASE_SET_2_CARD}:holo`)) {
    await page.evaluate(async id=>{await window.__holo.setCard(id);window.__holo.pose(0,0);},card.id);
    const stats=await page.evaluate(()=>window.__holo.stats());
    assert.equal(stats.profile,'pokemon-base-set-2-cosmos');
    const registration=await page.evaluate(async id=>{
      const card=window.__holo.cards.find(c=>c.id===id),material=window.__holo.material();
      const field=material.fieldTextureNode.value,{width,height,data}=field.image;
      const image=new Image();image.src=card.maps.motif;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const png=ctx.getImageData(0,0,image.width,image.height).data;
      let missing=0,extra=0,expected=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const px=Math.min(image.width-1,Math.floor((x+.5)/width*image.width));
        const py=Math.min(image.height-1,Math.floor((1-(y+.5)/height)*image.height));
        const mask=png[(py*image.width+px)*4]/255,actual=data[(y*width+x)*4+3];
        if(mask>.5){expected++;if(actual<80)missing++;}
        if(mask===0&&actual>8)extra++;
      }
      return {expected,missing,extra,flipY:field.flipY};
    },card.id);
    assert.equal(registration.flipY,false);assert.equal(registration.missing,0);assert.equal(registration.extra,0);assert.ok(registration.expected>100);

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
    report.push({...card,...difference,registration});console.log(card.title,JSON.stringify(difference));
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/report.json`,JSON.stringify({report,errors},null,2));
} finally {await browser.close();}
