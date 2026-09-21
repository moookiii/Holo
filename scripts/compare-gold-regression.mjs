// Optional pixel comparison against a separately served checkout from before the metal addition.
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
let executablePath=chromium.executablePath();
if(!existsSync(executablePath)) for(const folder of (await readdir(join(process.env.LOCALAPPDATA,'ms-playwright'))).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse()) {
  const path=join(process.env.LOCALAPPDATA,'ms-playwright',folder,'chrome-win64/chrome.exe');if(existsSync(path)){executablePath=path;break;}
}
const out=join(process.cwd(),'artifacts/gold-regression');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const report=[];
try {
  const pages=[];
  for(const url of [process.env.GOLD_BASELINE_URL || 'http://127.0.0.1:5176',process.env.GOLD_CURRENT_URL || 'http://127.0.0.1:5173']) {
    const page=await browser.newPage({viewport:{width:1100,height:1000},deviceScaleFactor:1});
    await page.goto(url);await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:120000});
    await page.evaluate(()=>{window.__holo.hideUI();window.__holo.setMode('rotate');});pages.push(page);
  }
  for(const id of ['charizard-base-set','pikachu-vmax-vivid-voltage','nocturne']) {
    const shots=[];
    for(const [i,page] of pages.entries()) {
      await page.evaluate(id=>window.__holo.setCard(id),id);
      await page.evaluate(()=>window.__holo.pose(12,-10));await page.waitForTimeout(500);
      shots.push((await page.screenshot({path:join(out,`${id}-${i?'current':'baseline'}.png`)})).toString('base64'));
    }
    const diff=await pages[1].evaluate(async shots=>{
      const pixels=[];
      for(const shot of shots){const image=new Image();image.src=`data:image/png;base64,${shot}`;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);pixels.push(ctx.getImageData(0,0,canvas.width,canvas.height).data);}
      let changed=0,sum=0,max=0;for(let i=0;i<pixels[0].length;i+=4)for(let j=0;j<3;j++){const d=Math.abs(pixels[0][i+j]-pixels[1][i+j]);sum+=d;max=Math.max(max,d);if(d>2)changed++;}
      return {meanChannelDifference:sum/(pixels[0].length*.75),changedChannelsAbove2:changed,maxDifference:max};
    },shots);
    report.push({id,...diff});
    assert.ok(diff.meanChannelDifference<.1,`${id}: existing image changed`);
  }
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
