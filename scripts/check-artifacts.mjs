import { chromium } from 'playwright';
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
let executablePath=chromium.executablePath();
if(!existsSync(executablePath)){const base=join(process.env.LOCALAPPDATA,'ms-playwright');for(const v of readdirSync(base).filter(n=>/^chromium-/.test(n)).reverse()){const p=join(base,v,'chrome-win64','chrome.exe');if(existsSync(p)){executablePath=p;break;}}}
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
mkdirSync('artifacts/bird-review',{recursive:true});
try {
await page.goto(process.env.ARTIFACT_URL || 'http://127.0.0.1:5174/artifacts');
await page.waitForSelector('[data-ready="true"]',{timeout:120000}).catch(async error=>{console.log(JSON.stringify({errors,text:await page.locator('body').innerText()}));await page.screenshot({path:'artifacts/bird-review/failure.png'});throw error;});
await page.waitForTimeout(1800);await page.screenshot({path:'artifacts/bird-review/hero.png'});
await page.getByLabel('Exploded view',{exact:true}).fill('65');await page.waitForTimeout(1500);await page.screenshot({path:'artifacts/bird-review/exploded.png'});
await page.getByLabel('Shell',{exact:true}).selectOption('hidden');await page.getByLabel('Lighting',{exact:true}).selectOption('Rim');await page.waitForTimeout(800);await page.screenshot({path:'artifacts/bird-review/hidden.png'});
await page.getByRole('button',{name:'Reset view'}).click();await page.waitForTimeout(1500);
// The registry currently contains one artifact: exercise its selection lifecycle
// without inventing another user-facing specimen.
await page.getByLabel('Exploded view',{exact:true}).fill('40');
await page.getByLabel('Shell',{exact:true}).selectOption('hidden');
await page.getByLabel('Choose artifact',{exact:true}).dispatchEvent('change');
await page.waitForTimeout(1800);
assert.equal(await page.getByLabel('Exploded view',{exact:true}).inputValue(),'0');
assert.equal(await page.getByLabel('Shell',{exact:true}).inputValue(),'clear');
await page.getByRole('button',{name:'Fullscreen ⛶',exact:true}).click();
assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),true);
await page.getByRole('button',{name:'Exit fullscreen ⛶',exact:true}).click();
await page.getByLabel('Shell',{exact:true}).selectOption('frosted');await page.getByLabel('Light azimuth',{exact:true}).fill('80');await page.waitForTimeout(800);await page.screenshot({path:'artifacts/bird-review/frosted.png'});
await page.getByRole('button',{name:'Reset view'}).click();await page.waitForTimeout(1500);await page.mouse.move(600,380);await page.mouse.down();await page.mouse.move(1050,430,{steps:20});await page.mouse.up();await page.mouse.wheel(0,-250);await page.waitForTimeout(1000);await page.screenshot({path:'artifacts/bird-review/rotated.png'});
await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Reset view'}).click();await page.waitForTimeout(1500);await page.screenshot({path:'artifacts/bird-review/mobile.png'});
await page.getByRole('link',{name:'Card studio ↗'}).click();
const entry=page.getByRole('link',{name:'Artifacts ↗'});
await entry.waitFor({timeout:120000});
const bounds=await entry.boundingBox();assert.ok(bounds && bounds.x<40 && bounds.y<50,'Artifacts entry should be at the top left');
const destinations=await page.locator('.top-actions').boundingBox();assert.ok(destinations && bounds.x+bounds.width<destinations.x,'Mobile navigation must not overlap');
await entry.click();await page.waitForSelector('[data-ready="true"]',{timeout:120000});
console.log(JSON.stringify({errors,controls:await page.locator('.artifact-options').innerText()},null,2));assert.deepEqual(errors,[]);
} finally { await browser.close(); }
