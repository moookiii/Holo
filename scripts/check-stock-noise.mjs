import { firefox, chromium } from 'playwright';
for(const [kind,executable,forceWebGL] of [[firefox,'C:/Users/jpall/AppData/Local/ms-playwright/firefox-1543/firefox/firefox.exe',true],[chromium,'C:/Users/jpall/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',false]]){
 const browser=await kind.launch({executablePath:executable,headless:true,args:kind===chromium?['--enable-unsafe-webgpu']:[]});
 try{const page=await browser.newPage();page.on('pageerror',e=>console.log(String(e)));await page.goto('http://127.0.0.1:5173/tests/');console.log(await page.evaluate(async gl=>(await import('/tests/stock-noise-gpu.ts')).verifyStockNoise(gl),forceWebGL));}finally{await browser.close();}
}
