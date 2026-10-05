import { firefox } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const dir = `artifacts/cross-card-${process.argv[2] || 'current'}`;
await mkdir(dir, {recursive:true});
const browser = await firefox.launch({executablePath:'C:/Users/jpall/AppData/Local/ms-playwright/firefox-1543/firefox/firefox.exe',headless:true});
try {
const page = await browser.newPage({viewport:{width:1440,height:1100}});
page.on('pageerror',e=>console.log(String(e)));
if (process.env.IGNORE_HMR) await page.routeWebSocket('**', socket => socket.close());
await page.goto(process.env.PROFILE_URL || 'http://127.0.0.1:5173/');
await page.waitForFunction(()=>window.__holo?.gallery.stats()?.visible>0,null,{timeout:120000});
const results=[];
await page.evaluate(()=>{
 window.pipelineRows=[];
 const backend=window.__holo.renderer.backend,create=backend.createRenderPipeline;
 backend.createRenderPipeline=function(object,promises){
  const start=performance.now(); const result=create.call(this,object,promises);
  window.pipelineRows.push({ms:performance.now()-start,type:object.material.type,vertex:object.pipeline.vertexProgram.code,fragment:object.pipeline.fragmentProgram.code});return result;
 };
});
const ids = process.env.CARD_IDS?.split(',') || ['alakazam-base-set','blastoise-base-set','chansey-base-set'];
for(const id of ids){
 const result=await page.evaluate(async id=>{const h=window.__holo;window.pipelineRows=[];const start=performance.now();await h.gallery.close(id);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));h.lighting.playing=false;h.pose(-15,-10,0);return {id,ms:performance.now()-start,rows:window.pipelineRows,opening:h.opening()};},id);
 for(const [i,row] of result.rows.entries()){await writeFile(`${dir}/${id}-${i}.frag`,row.fragment);await writeFile(`${dir}/${id}-${i}.vert`,row.vertex);delete row.fragment;delete row.vertex;}
 await page.waitForFunction(() => document.querySelector('#loading').hidden);
 await page.waitForTimeout(150);await page.screenshot({path:`${dir}/${id}.png`});results.push(result);console.log(JSON.stringify({id,ms:result.ms,rows:result.rows}));
 await page.evaluate(()=>window.__holo.gallery.open());
}
await writeFile(`${dir}/report.json`,JSON.stringify(results,null,2));
if (!process.env.CARD_IDS && results.slice(1).some(result => result.rows.length)) throw Error('Different Base Set cards compiled duplicate GPU pipelines');
}finally{await browser.close();}
