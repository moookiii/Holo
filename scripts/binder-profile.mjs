import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
try {
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 await page.routeWebSocket('**',s=>s.close());
 page.on('pageerror',e=>console.log('ERROR',String(e)));
 await page.goto('http://127.0.0.1:5173/?backend=webgpu&benchmark-cold-viewer=1');
 await page.waitForFunction(()=>{const s=window.__holo?.gallery.stats();return s?.active&&s.visibleExpected&&s.visible===s.visibleExpected;},null,{timeout:120000});
 const report=await page.evaluate(async()=>{
  const g=window.__holo.gallery.instance(), events=[], start=performance.now();
  const {CardFactory}=await import('/src/card/CardFactory.ts');
  const wrap=(object,key)=>{const original=object[key];object[key]=async function(...args){const t=performance.now();try{return await original.apply(this,args);}finally{events.push({stage:key,at:t-start,ms:performance.now()-t,id:typeof args[0]==='string'?args[0]:args[0]?.id||args[0]?.definition?.id||args[0]?.name});}};};
  for(const key of ['prepare','prepareMaps','prepareLayer'])wrap(g.options.cpu,key);
  for(const key of ['blob','image'])wrap(g.options.cpu.assets,key);
  const factory=g.options.binderFactory;g.options.binderFactory=()=>{const f=factory();for(const key of ['realizeCardGpu','uploadCardResources','compile','finishResourceUploads'])wrap(f,key);return f;};
  for(const key of ['realizeCardGpu','uploadCardResources','compile','finishResourceUploads'])wrap(CardFactory.prototype,key);
  g.favorites.ids=new Set(g.catalog.cards().slice(0,73).map(c=>c.id));
  g.options.lighting.playing=false;g.options.lighting.setPreset('Skim');
  const click=performance.now();g.openBinder();const constructMs=performance.now()-click;
  await new Promise(r=>requestAnimationFrame(r));
  while(g.stats().visible!==g.stats().visibleExpected){if(performance.now()-click>120000)throw Error('Timeout');await new Promise(r=>requestAnimationFrame(r));}
  const visibleMs=performance.now()-click, stats=g.stats();
  await g.binder.suspendPreparation();
  return {constructMs,visibleMs,stats,events};
 });
 await mkdir('artifacts/favorites-binder',{recursive:true});
 await writeFile(`artifacts/favorites-binder/profile-${process.env.BINDER_LABEL||'baseline'}.json`,JSON.stringify(report,null,2));
 await page.screenshot({path:`artifacts/favorites-binder/profile-${process.env.BINDER_LABEL||'baseline'}.png`});
 console.log(JSON.stringify(report));
}finally{await browser.close();}
