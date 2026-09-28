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
const out = `artifacts/star-registration/${backend}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 850, height: 1050 } });
const errors = [], report = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
  await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
  const placements=JSON.parse(await (await import('node:fs/promises')).readFile('scripts/wotc/star-placements.json','utf8'));
  const fieldChecks=await page.evaluate(async placements=>{
    const {generateField}=await import('/src/materials/patterns/ManufacturingField.ts');
    const h=window.__holo,results=[];
    for(const card of h.cards.filter(c=>c.profile==='pokemon-base-set-star')) {
      const key=card.pokemon?.id ?? `base1-${parseInt(card.number)}`;
      const im=new Image();im.src=card.maps.motif;await im.decode();
      const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;
      const ctx=cv.getContext('2d');ctx.drawImage(im,0,0);
      const rgba=ctx.getImageData(0,0,im.width,im.height).data;
      const data=new Uint8Array(im.width*im.height);for(let i=0;i<data.length;i++)data[i]=rgba[i*4];
      const spec={kind:'base-set-star',seed:card.seed,aspect:6.3/8.8,scale:16};
      const f=generateField(spec,512,{width:im.width,height:im.height,data});
      let missed=0,stray=0,raised=0;
      for(const [x,y] of placements[key]) {
        const px=Math.floor(x/600*f.width),py=Math.floor((1-y/825)*f.height);
        let peak=0;
        for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)peak=Math.max(peak,f.direction[((py+dy)*f.width+px+dx)*4+3]);
        if(peak<150)missed++;
      }
      for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++) {
        const ix=Math.min(im.width-1,Math.floor((x+.5)/512/spec.aspect*im.width));
        const iy=Math.min(im.height-1,Math.floor((1-(y+.5)/512)*im.height));
        const i=(y*f.width+x)*4;
        if(data[iy*im.width+ix]===0 && f.direction[i+3]>64)stray++;
        if(f.relief[i+2]!==128)raised++;
      }
      results.push({key,stars:placements[key].length,missed,stray,raised});
    }
    return results;
  },placements);
  assert.equal(fieldChecks.length,47);
  for(const r of fieldChecks){assert.equal(r.missed,0,r.key);assert.equal(r.stray,0,r.key);assert.equal(r.raised,0,r.key);}
  await page.evaluate(async()=>{const h=window.__holo;h.hideUI();await h.setCard('pokemon:base2-2:holo');h.pose(0,0);});
  const response=[];
  for(const light of ['Studio','Strip','Soft','Low key']) {
    await page.evaluate(light=>window.__holo.lighting.setPreset(light),light);
    await page.waitForTimeout(220);
    const lit=await page.screenshot({path:`${out}/electrode-${light.replaceAll(' ','-')}.png`});
    const uniforms=await page.evaluate(()=>{const u=window.__holo.material().optics;const keys=['strength','glintStrength','foilReflectance','sheen','neutralGain'];const values=Object.fromEntries(keys.map(k=>[k,u[k].value]));for(const k of keys)u[k].value=0;return values;});
    await page.waitForTimeout(220);const dark=await page.screenshot();
    const values=await page.evaluate(async ({a,b,stars})=>{
      async function decode(s){const im=new Image();im.src='data:image/png;base64,'+s;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const cx=c.getContext('2d');cx.drawImage(im,0,0);return {pixels:cx.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height};}
      const [a1,b1]=await Promise.all([decode(a),decode(b)]);let left=a1.w,right=0,top=a1.h,bottom=0;
      for(let y=0;y<a1.h;y++)for(let x=0;x<a1.w;x++){const i=(y*a1.w+x)*4;if(Math.max(...a1.pixels.slice(i,i+3))>25){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
      return stars.map(([x,y])=>{const sx=Math.round(left+x/600*(right-left)),sy=Math.round(top+y/825*(bottom-top));let peak=0,pixels=0;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const i=((sy+dy)*a1.w+sx+dx)*4;const delta=Math.max(...[0,1,2].map(k=>Math.abs(a1.pixels[i+k]-b1.pixels[i+k])));peak=Math.max(peak,delta);if(delta>3)pixels++;}return {x,y,peak,pixels};});
    },{a:lit.toString('base64'),b:dark.toString('base64'),stars:placements['base2-2']});
    response.push({light,values});
    await page.evaluate(values=>{const u=window.__holo.material().optics;for(const [k,v]of Object.entries(values))u[k].value=v;},uniforms);
  }
  for(let i=0;i<8;i++)assert.ok(response.some(r=>r.values[i].pixels>3),`Electrode star ${i+1} has no live reflection`);
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/registration-report.json`,JSON.stringify({fieldChecks,response,errors},null,2));
  console.log(JSON.stringify({cards:fieldChecks.length,stars:fieldChecks.reduce((n,r)=>n+r.stars,0),electrode:response},null,2));
} finally {await browser.close();}
