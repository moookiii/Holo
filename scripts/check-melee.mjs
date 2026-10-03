import { chromium } from 'playwright';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
let executablePath=chromium.executablePath();
if(!existsSync(executablePath)){const base=join(process.env.LOCALAPPDATA,'ms-playwright');for(const v of readdirSync(base).filter(n=>/^chromium-/.test(n)).reverse()){const p=join(base,v,'chrome-win64','chrome.exe');if(existsSync(p)){executablePath=p;break;}}}
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const out='artifacts/melee-review';mkdirSync(out,{recursive:true});
const ready=()=>page.waitForSelector('[data-ready="true"]',{timeout:120000});
const shot=async name=>{await page.waitForTimeout(750);await page.screenshot({path:`${out}/${name}.png`});};
// Test-only instrumentation of the dev response; no debug globals ship in Holo.
await page.route('**/src/artifacts/ArtifactPage.ts*',async route=>{
  const response=await route.fetch(),source=await response.text();
  const instrumented=source.replace('await renderer.init();','await renderer.init(); window.__artifactRenderer = renderer;');
  assert.notEqual(source,instrumented,'Renderer instrumentation must attach');
  await route.fulfill({response,body:instrumented});
});
try {
  await page.goto(process.env.ARTIFACT_URL || 'http://127.0.0.1:5182/artifacts');await ready();
  await page.getByLabel('Choose artifact',{exact:true}).selectOption('melee-disc');await ready();
  await shot('front-studio');
  const stage=page.locator('.artifact-stage');await stage.focus();
  for(let i=0;i<31;i++)await stage.press('ArrowLeft');await shot('back-studio');
  await page.getByLabel('Light azimuth',{exact:true}).fill('150');
  await page.getByLabel('Light elevation',{exact:true}).fill('25');await shot('back-focused');
  await page.getByLabel('Light azimuth',{exact:true}).fill('-140');await shot('back-light-moved');
  for(let i=0;i<4;i++)await stage.press('ArrowLeft');await shot('back-tilt');
  await page.getByLabel('Lighting',{exact:true}).selectOption('Soft');await shot('back-soft');
  await page.getByLabel('Lighting',{exact:true}).selectOption('Rim');await shot('back-rim');
  for(let i=0;i<12;i++)await stage.press('ArrowLeft');await shot('edge');
  await page.getByRole('button',{name:'Reset view'}).click();await ready();
  await page.mouse.move(700,450);await page.mouse.wheel(0,-350);await shot('front-close');
  await page.mouse.move(650,450);await page.mouse.down();await page.mouse.move(770,470,{steps:15});await page.mouse.up();await shot('front-drag');
  await page.getByLabel('Light azimuth',{exact:true}).fill('70');await shot('front-light-moved');
  await page.getByRole('button',{name:'Fullscreen ⛶',exact:true}).click();
  assert.equal(await page.evaluate(()=>!!document.fullscreenElement),true);
  await page.getByRole('button',{name:'Exit fullscreen ⛶',exact:true}).click();
  const memory=[];
  for(let i=0;i<3;i++)for(const id of ['robotic-bird','melee-disc']){
    await page.getByLabel('Choose artifact',{exact:true}).selectOption(id);await ready();
    await page.waitForTimeout(150);
    memory.push({id,...await page.evaluate(()=>({...window.__artifactRenderer.info.memory}))});
  }
  for(const id of ['robotic-bird','melee-disc']){
    const samples=memory.filter(s=>s.id===id);
    assert.deepEqual(samples[2],samples[1],`${id}: GPU resource counts must stabilize after switching`);
  }
  await page.getByRole('button',{name:'Reset view'}).click();await ready();
  assert.equal(await page.getByLabel('Light azimuth',{exact:true}).inputValue(),'-35');
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Reset view'}).click();await ready();await shot('mobile');
  writeFileSync(`${out}/browser-report.json`,JSON.stringify({errors,artifact:await page.locator('h1').innerText(),switches:6,memory},null,2));
  assert.deepEqual(errors,[]);console.log('Melee interactions and six artifact switches passed without browser errors.');
} catch(error){console.log(errors);await shot('failure');throw error;} finally {await browser.close();}
