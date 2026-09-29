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
  await page.waitForTimeout(2000);
  for(const value of ['0','17','75','0']) { await page.getByLabel('Exploded view',{exact:true}).fill(value); await page.waitForTimeout(1800); await shot('plastic-'+value); }
  console.log(JSON.stringify({errors},null,2));writeFileSync(`${out}/browser-report.json`,JSON.stringify({errors},null,2));if(errors.length)process.exitCode=1;
} finally {await browser.close();}

