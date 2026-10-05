import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir,readdir,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const out=join(process.cwd(),'artifacts/favorites-binder'); await mkdir(out,{recursive:true});
let executablePath=chromium.executablePath();
if(!existsSync(executablePath)) for(const dir of (await readdir(join(process.env.LOCALAPPDATA,'ms-playwright'))).filter(n=>/^chromium-/.test(n)).sort().reverse()) { const p=join(process.env.LOCALAPPDATA,'ms-playwright',dir,'chrome-win64/chrome.exe'); if(existsSync(p)){executablePath=p;break;} }
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const errors=[],report={errors,turns:[]}; page.on('pageerror',e=>errors.push(String(e))); page.on('console',e=>{if(e.type()==='warning')console.log('WARN',e.text().slice(0,250));});
const state=()=>page.evaluate(()=>window.__holo.gallery.stats());
const ready=()=>page.waitForFunction(()=>{const s=window.__holo?.gallery.stats();return s?.binder&&!s.preparing&&s.visible===s.visibleExpected&&!s.visibleFailed;},null,{timeout:240000});
const capture=async name=>page.screenshot({path:join(out,`${name}.png`)});
async function collection(count){
 await page.evaluate(count=>{const g=window.__holo.gallery.instance(),cards=g.catalog.cards().slice(0,count); g.favorites.ids=new Set(cards.map(c=>c.id)); if(g.binder?.active)g.binder.refresh(cards);else g.openBinder();},count);
 await page.waitForFunction(n=>window.__holo.gallery.stats().filtered===n,count);await ready();
}
async function turn(direction,target){
 await page.locator('.binder-stage').focus(); await page.keyboard.press(direction===1?'ArrowRight':'ArrowLeft');
 await page.waitForFunction(target=>{const s=window.__holo.gallery.stats();return s.spread===target&&!s.turning;},target,{timeout:60000});
 const s=await state();assert.equal(s.leftStack+s.rightStack,20);assert.ok(s.residentPages<=6);report.turns.push(s.spread); console.log("spread",s.spread);
}
try{
 await page.routeWebSocket('**', socket => socket.close());
 await page.goto(process.env.BINDER_URL||'http://127.0.0.1:5173/?backend=webgl',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__holo?.gallery.stats()?.active,null,{timeout:120000});
 await collection(0);await page.getByLabel('Gallery lighting',{exact:true}).last().selectOption('Soft');await page.waitForTimeout(1000);await capture('empty-corrected');
 assert.equal((await state()).spread,1);
 const pose=()=>page.evaluate(()=>{const b=window.__holo.gallery.instance().binder;return {camera:window.__holo.camera.position.toArray(),tilt:[b.tilt.targetX,b.tilt.targetY],vertices:Array.from(b.physical.pages.get(2).hitMesh.geometry.getAttribute('position').array)};});
 const initial=await pose();await page.mouse.move(1500,500);await page.waitForTimeout(250);assert.deepEqual(await pose(),initial);
 await page.mouse.wheel(0,600);await page.waitForTimeout(150);assert.deepEqual((await pose()).camera,initial.camera);
 // A shell/spine press cannot rotate. Rotation depends on where the press started.
 await page.mouse.move(800,500);await page.mouse.down();await page.mouse.move(860,550,{steps:8});await page.mouse.up();assert.deepEqual((await pose()).tilt,initial.tilt);
 await page.mouse.move(12,500);await page.mouse.down();await page.mouse.move(30,520,{steps:8});await page.mouse.up();assert.notDeepEqual((await pose()).tilt,initial.tilt);
 await page.evaluate(()=>{const b=window.__holo.gallery.instance().binder;b.tilt.targetX=-.065;b.tilt.targetY=0;});await page.waitForTimeout(500);
 // Actual pointer capture: grab the projected outer right edge and release on either side of the threshold.
 const edge=await page.evaluate(()=>{const b=window.__holo.gallery.instance().binder,p=b.physical.pages.get(2),v=window.__holo.camera.position.clone();v.set(29.7,0,1.97).applyMatrix4(b.physical.group.matrixWorld).project(window.__holo.camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};});
 await page.mouse.move(edge.x,edge.y);await page.mouse.down();await page.mouse.move(edge.x-180,edge.y,{steps:10});
 assert.equal((await state()).dragging,true);assert.deepEqual((await pose()).camera,initial.camera); await capture('drag-follow');await page.mouse.up();
 await page.waitForFunction(()=>!window.__holo.gallery.stats().turning);assert.equal((await state()).spread,1);
 await page.mouse.move(edge.x,edge.y);await page.mouse.down();await page.mouse.move(400,edge.y,{steps:18});await capture('drag-across');await page.mouse.up();
 await page.waitForFunction(()=>!window.__holo.gallery.stats().turning);assert.equal((await state()).spread,2);
 for(let s=3;s<=20;s++){await turn(1,s);if([4,10,20].includes(s))await capture(`spread-${s}`);}
 for(let s=19;s>=0;s--)await turn(-1,s);
 await turn(1,1);
 await collection(73);await ready();await capture('cards-corrected');
 for(let s=2;s<=5;s++){await turn(1,s);await ready();const expected=Math.min(24,Math.max(0,73-(2*s-1)*12));assert.equal((await state()).visible,expected);}
 await collection(961);await page.getByLabel('Select favorites binder').selectOption('2');await ready();assert.equal((await state()).binderIndex,2);assert.equal((await state()).spread,1);
 await turn(-1,0);await ready();assert.equal((await state()).visible,1);await capture('third-binder');
 const card=page.locator('.binder-card').first(); const rect=await card.boundingBox();await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
 await page.waitForFunction(()=>!window.__holo.gallery.stats().active,null,{timeout:120000});
 await page.evaluate(()=>window.__holo.gallery.open());await ready();assert.equal((await state()).binderIndex,2);
 report.final=await state();assert.ok(report.final.residentCards<=72);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({turns:report.turns.length,final:report.final,errors}));
}finally{report.snapshot=await state().catch(()=>null); console.log('SNAPSHOT',JSON.stringify(report.snapshot));await writeFile(join(out,'correction-report.json'),JSON.stringify(report,null,2));await browser.close();}
