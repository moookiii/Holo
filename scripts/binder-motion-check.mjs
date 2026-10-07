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
 await page.goto(process.env.BINDER_URL||'http://127.0.0.1:5173/?backend=webgpu',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__holo?.gallery.stats()?.active,null,{timeout:120000});await collection(0);
 await page.waitForFunction(()=>!window.__holo.gallery.stats().pending,null,{timeout:120000});await page.waitForTimeout(300);
 const originalPages=await page.evaluate(()=>{
 const b=window.__holo.gallery.instance().binder,backend=window.__holo.renderer.backend;
 window.liftMetrics={pipelines:0,textures:0,normals:0,updates:[],landings:[]};
 for(const [method,key] of [['createRenderPipeline','pipelines'],['createTexture','textures']]){const original=backend[method];backend[method]=function(...args){window.liftMetrics[key]++;return original.apply(this,args);};}
 for(const sheet of b.physical.sheets)for(const mesh of [sheet.body,sheet.edge]){const original=mesh.geometry.computeVertexNormals;mesh.geometry.computeVertexNormals=function(){window.liftMetrics.normals++;return original.call(this);};}
 const original=b.update;b.update=function(...args){const start=performance.now(),turning=!!this.navigation.turn;const result=original.apply(this,args),ms=performance.now()-start;window.liftMetrics.updates.push(ms);if(turning&&!this.navigation.turn)window.liftMetrics.landings.push(ms);return result;};
 return b.physical.preparationPages.map(p=>p.group.uuid).sort();
 });
 await page.mouse.move(1350,500);await page.mouse.down();await page.mouse.move(1320,500);await page.waitForTimeout(180);
 const lift=await page.evaluate(()=>window.liftMetrics);assert.equal(lift.pipelines,0);assert.equal(lift.textures,0);assert.equal(lift.normals,0);
 await page.mouse.up();await page.waitForFunction(()=>!window.__holo.gallery.stats().turning);
 for(let target=1;target<=8;target++)await turn(1,target);
 for(let target=7;target>=0;target--)await turn(-1,target);
 const finalPages=await page.evaluate(()=>window.__holo.gallery.instance().binder.physical.preparationPages.map(p=>p.group.uuid).sort());assert.deepEqual(finalPages,originalPages,'page geometry/materials must be reused across landings');
 report.motion=await page.evaluate(()=>window.liftMetrics);assert.equal(report.motion.pipelines,0);assert.equal(report.motion.textures,0);assert.deepEqual(errors,[]);
 console.log('MOTION',JSON.stringify({backend:await page.evaluate(()=>window.__holo.stats().backend),pipelines:report.motion.pipelines,textures:report.motion.textures,landingsMs:report.motion.landings}));
 await capture('motion-settled');
 await collection(73);
 await page.waitForFunction(()=>!window.__holo.gallery.stats().pending,null,{timeout:240000});
 const before=await page.evaluate(()=>window.liftMetrics.landings.length);
 await turn(1,1);
 await page.waitForFunction(()=>!window.__holo.gallery.stats().pending,null,{timeout:240000});
 await turn(1,2);
 await ready();
 report.populated=await state();
 assert.equal(report.populated.visible,report.populated.visibleExpected);
 assert.equal(report.populated.visibleFailed,0);
 report.populatedLandings=await page.evaluate(n=>window.liftMetrics.landings.slice(n),before);
 assert.ok(Math.max(...report.populatedLandings)<50,'populated landing update exceeded 50 ms');
 await capture('motion-populated');
 console.log('POPULATED',JSON.stringify({landingsMs:report.populatedLandings,visible:report.populated.visible}));
}finally{await writeFile(join(out,'lift-landing-report.json'),JSON.stringify(report,null,2));await browser.close();}