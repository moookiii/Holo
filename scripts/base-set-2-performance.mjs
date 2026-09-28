import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(root)).filter(name => /^chromium-\d+$/.test(name)).sort().reverse()) {
    const candidate = join(root, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const out = join(process.cwd(), 'artifacts', 'base-set-2-performance');
await mkdir(out, { recursive: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && response.url().includes('127.0.0.1')) errors.push(`${response.status()} ${response.url()}`); });
// Only discovery is stubbed to keep live API outages out of this local UI test.
// Actual Base Set 2 metadata, assets, collation, preparation and rendering run normally.
await page.route('https://api.tcgdex.net/v2/en/series', route => route.fulfill({ json: [{ id: 'base', name: 'Base' }] }));
await page.route('https://api.tcgdex.net/v2/en/series/base', route => route.fulfill({ json: { id: 'base', name: 'Base', sets: [
  { id: 'base4', name: 'Base Set 2' }, { id: 'base1', name: 'Base Set' }, { id: 'base2', name: 'Jungle' },
] } }));
const results=[];
const frames = async () => page.evaluate(async()=>{
 const values=[];let last=performance.now();
 for(let i=0;i<100;i++){await new Promise(resolve=>requestAnimationFrame(resolve));const now=performance.now();if(i>15)values.push(now-last);last=now;}
 values.sort((a,b)=>a-b);return {median:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)]};
});
try {
 await page.goto('http://127.0.0.1:5173/?backend=webgl');
 await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
 for(const [set,art,id,card] of [['Fossil','Lapras','base3','pokemon:base3-10:holo'],['Base Set 2','Mewtwo','base4','pokemon:base4-13:holo']]) {
  const field=await page.evaluate(async id=>{
   const {generateField}=await import('/src/materials/patterns/ManufacturingField.ts');
   const kind=id==='base4'?'base-set-2-cosmos':'base-set-star',times=[];
   const image=new Image();image.src=id==='base4'?'/cards/pokemon/base-set-2/maps/13-cosmos.png':'/cards/pokemon/fossil/maps/10-stars.png';await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const rgba=ctx.getImageData(0,0,image.width,image.height).data,data=new Uint8Array(image.width*image.height);for(let i=0;i<data.length;i++)data[i]=rgba[i*4];
   const motif={width:image.width,height:image.height,data};
   for(let i=0;i<3;i++){const start=performance.now();const f=generateField({kind,seed:200013,aspect:6.3/8.8,scale:29},undefined,motif);times.push({ms:performance.now()-start,bytes:f.direction.byteLength+f.relief.byteLength});}
   return times;
  },id);
  await page.evaluate(async card=>{await window.__holo.setCard(card);window.__holo.pose(14,-8);},card);
  const viewer=await frames();
  await page.evaluate(()=>window.__holo.pack.browse());
  await page.getByRole('button',{name:/Pok\u00e9mon/}).click();await page.getByRole('button',{name:/^Base$/}).click();
  await page.getByRole('button',{name:new RegExp(`^${set} Opening available`)}).click();
  await page.getByRole('button',{name:new RegExp(`^${art} booster`)}).waitFor();
  const seed=await page.evaluate(async id=>{
   const {collatePokemon}=await import('/src/pokemon/collator.ts');
   const {baseSet2Cards}=await import('/src/pokemon/BaseSet2Catalog.ts');
   const {fossilCards}=await import('/src/pokemon/FossilCatalog.ts');
   for(let seed=0;seed<1000;seed++)if(collatePokemon(id,id==='base4'?'mewtwo':'lapras',seed,id==='base4'?baseSet2Cards:fossilCards).pulls[10].variant==='holo')return seed;
  },id);
  await page.evaluate(seed=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=seed;crypto.getRandomValues=original;return a;};},seed);
  const start=Date.now();await page.getByRole('button',{name:new RegExp(`^${art} booster`)}).click();
  await page.waitForFunction(()=>window.__holo.pack.stats().state==='PackReady',null,{timeout:120000});
  const prepareMs=Date.now()-start,resources=await page.evaluate(()=>window.__holo.factory.stats());
  const stages=[];
  for(const stage of ['tear','open']) {
   stages.push(await page.evaluate(async stage=>{
    const frames=[],cost=[];let last=performance.now();
    for(let i=0;i<100;i++){await new Promise(resolve=>requestAnimationFrame(resolve));const now=performance.now();if(i>15)frames.push(now-last);last=now;const t=performance.now();window.__holo.pack.setStage(stage,i/99);cost.push(performance.now()-t);}
    frames.sort((a,b)=>a-b);cost.sort((a,b)=>a-b);return {stage,frameMedian:frames[Math.floor(frames.length*.5)],frameP95:frames[Math.floor(frames.length*.95)],updateP95:cost[95]};
   },stage));
  }
  await page.evaluate(()=>{window.__holo.pack.setStage('reveal',10);window.__holo.pack.tick(2);});const reveal=await frames();
  await page.evaluate(()=>window.__holo.pack.close());
  results.push({set,field,viewer,prepareMs,resources,stages,reveal});console.log(JSON.stringify(results.at(-1)));
 }
 assert.deepEqual(errors,[]);
 const {writeFile}=await import('node:fs/promises');await writeFile(join(out,'report.json'),JSON.stringify({results,errors},null,2));
} finally {await browser.close();}
