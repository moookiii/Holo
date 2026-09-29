import { chromium } from 'playwright';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
let executablePath=chromium.executablePath();
if(!existsSync(executablePath)){const base=join(process.env.LOCALAPPDATA,'ms-playwright');for(const v of readdirSync(base).filter(n=>/^chromium-/.test(n)).reverse()){const p=join(base,v,'chrome-win64','chrome.exe');if(existsSync(p)){executablePath=p;break;}}}
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const out='artifacts/bird-refinement';mkdirSync(out,{recursive:true});
try {
  await page.goto(process.env.ARTIFACT_URL || 'http://127.0.0.1:5175/Holo/artifacts/');
  await page.waitForSelector('[data-ready="true"]',{timeout:120000});
  const shot=async name=>{await page.waitForTimeout(650);await page.screenshot({path:`${out}/${name}.png`});};
  await shot('hero');
  const stage=page.locator('.artifact-stage');await stage.focus();
  for(let i=0;i<4;i++)await stage.press('ArrowRight');
  for(const [index,name] of ['reference-side','front-three-quarter','front','opposite-front-three-quarter','opposite-side','rear-three-quarter','rear','reference-rear-three-quarter'].entries()){
    if(index)for(let i=0;i<8;i++)await stage.press('ArrowLeft');
    await shot(name);
  }
  await page.getByRole('button',{name:'Reset view'}).click();await page.waitForTimeout(1500);await stage.focus();
  for(let i=0;i<8;i++)await stage.press('ArrowDown');await shot('above');
  await page.getByRole('button',{name:'Reset view'}).click();await page.waitForTimeout(1500);await stage.focus();
  for(let i=0;i<6;i++)await stage.press('ArrowUp');await shot('below');
  await page.getByRole('button',{name:'Reset view'}).click();await page.waitForTimeout(1500);
  for(const state of ['hidden','frosted','clear']){await page.getByLabel('Shell',{exact:true}).selectOption(state);await shot(state);}
  await page.getByLabel('Exploded view',{exact:true}).fill('75');await shot('exploded');
  await page.getByLabel('Exploded view',{exact:true}).fill('0');
  for(const light of ['Soft','Rim','Studio']){await page.getByLabel('Lighting',{exact:true}).selectOption(light);await shot(light.toLowerCase());}
  await page.getByLabel('Light azimuth',{exact:true}).fill('90');await page.getByLabel('Light elevation',{exact:true}).fill('15');await shot('movable-light');
  console.log(JSON.stringify({errors},null,2));writeFileSync(`${out}/browser-report.json`,JSON.stringify({errors},null,2));if(errors.length)process.exitCode=1;
} finally {await browser.close();}
