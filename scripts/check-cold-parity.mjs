import {firefox} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
const browser=await firefox.launch({executablePath:'C:/Users/jpall/AppData/Local/ms-playwright/firefox-1543/firefox/firefox.exe',headless:true});
const dir='artifacts/cold-parity';await mkdir(dir,{recursive:true});const results=[];
try{for(const serial of [true,false]){
 const page=await browser.newPage({viewport:{width:1000,height:1000}});page.on('pageerror',e=>console.log(String(e)));await page.routeWebSocket('**',s=>s.close());
 await page.goto('http://127.0.0.1:5173/'+(serial?'?serial-card-preparation':''));await page.waitForFunction(()=>window.__holo?.gallery.stats()?.visible>0,null,{timeout:120000});
 const ms=await page.evaluate(async()=>{const h=window.__holo;h.lighting.playing=false;const t=performance.now();await h.gallery.close('pokemon:sv08.5-156:holo');return performance.now()-t;});
 await page.waitForFunction(()=>document.querySelector('#loading').hidden);await page.waitForTimeout(500);
 for(const [name,pose,preset]of [['front',[0,0,0],'Studio'],['tilt',[-25,15,0],'Studio'],['dark',[20,-15,0],'Low key']]){
 await page.evaluate(({pose,preset})=>{const h=window.__holo;h.pose(...pose);h.lighting.setPreset(preset);h.lighting.playing=false;}, {pose,preset});await page.waitForTimeout(700);await page.screenshot({path:`${dir}/${serial?'serial':'parallel'}-${name}.png`});
 }results.push({serial,ms,opening:await page.evaluate(()=>window.__holo.opening())});console.log({serial,ms});await page.close();
}await writeFile(`${dir}/report.json`,JSON.stringify(results,null,2));}finally{await browser.close();}
