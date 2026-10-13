import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 page.on('pageerror',e=>errors.push(String(e)));
 await page.routeWebSocket('**',s=>s.close());
 await page.goto('http://127.0.0.1:5173/?backend=webgpu&benchmark-cold-viewer=1');
 await page.waitForFunction(()=>window.__holo?.gallery.stats()?.active,null,{timeout:120000});
 console.log('Gallery started');
 await page.evaluate(()=>{
  const g=window.__holo.gallery.instance();
  const cards=g.catalog.cards().slice(0,80);
  g.favorites.ids=new Set(cards.map(c=>c.id));
  window.binderPreviewCheck={start:performance.now(),fullPreparations:0};
  const cpu=g.options.cpu, original=cpu.prepare;
  cpu.prepare=function(...args){window.binderPreviewCheck.fullPreparations++;return original.apply(this,args)};
  g.openBinder();
 });
 await page.waitForFunction(()=>{const s=window.__holo.gallery.stats();return s.binder&&s.visible===s.visibleExpected&&s.visible>0},null,{timeout:120000});
 const first=await page.evaluate(()=>({ms:performance.now()-window.binderPreviewCheck.start,stats:window.__holo.gallery.stats(),fullPreparations:window.binderPreviewCheck.fullPreparations}));
 console.log('First spread',JSON.stringify(first));
 assert.equal(first.fullPreparations,0);
 assert.equal(first.stats.fullQualityReady,0);
 await page.screenshot({path:'artifacts/binder-preview-first.png'});
 await page.evaluate(()=>window.__holo.gallery.instance().binder.turn(1));
 await page.waitForFunction(()=>{const s=window.__holo.gallery.stats();return s.spread===1&&!s.turning&&s.visible===s.visibleExpected},null,{timeout:120000});
 const second=await page.evaluate(()=>({stats:window.__holo.gallery.stats(),fullPreparations:window.binderPreviewCheck.fullPreparations}));
 assert.equal(second.fullPreparations,0);assert.equal(second.stats.visible,24);
 await page.screenshot({path:'artifacts/binder-preview-turn.png'});
 assert.deepEqual(errors,[]);
 await writeFile('artifacts/binder-preview-check.json',JSON.stringify({first,second,errors},null,2));
 console.log('PASS gallery previews, no full preparations, page turn, no browser errors');
}finally{await browser.close()}
