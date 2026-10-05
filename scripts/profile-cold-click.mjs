import {firefox} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
const results=[];await mkdir('artifacts/cold-click',{recursive:true});
for(let run=0;run<3;run++){
 const browser=await firefox.launch({executablePath:'C:/Users/jpall/AppData/Local/ms-playwright/firefox-1543/firefox/firefox.exe',headless:true});
 try{const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.routeWebSocket('**',s=>s.close());
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__holo?.gallery.stats()?.visible>0,null,{timeout:120000});
 const t=Date.now();await page.locator('.gallery-card').first().click();await page.waitForFunction(()=>!window.__holo.gallery.stats().active&&document.querySelector('#loading').hidden,null,{timeout:120000});
 const result={run,clickWallMs:Date.now()-t,opening:await page.evaluate(()=>window.__holo.opening()),errors};results.push(result);console.log(JSON.stringify({run,ms:result.clickWallMs,event:result.opening.events.at(-1),errors}));
 await page.screenshot({path:`artifacts/cold-click/${run}.png`});
 }finally{await browser.close();}
}
await writeFile('artifacts/cold-click/report.json',JSON.stringify(results,null,2));
