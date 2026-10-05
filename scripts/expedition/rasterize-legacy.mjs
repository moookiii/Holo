/** Rasterize canonical existing coverage without changing geometry or grayscale. */
import { chromium } from 'playwright';
import { readFile, writeFile, existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
const read = promisify(readFile), write = promisify(writeFile);
const options = { headless: true };
if (!existsSync(chromium.executablePath())) {
  const root = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const version of (await readdir(root)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const executable = join(root,version,'chrome-win64/chrome.exe');
    if (existsSync(executable)) { options.executablePath = executable; break; }
  }
}
const browser = await chromium.launch(options);
try {
  const page = await browser.newPage();
  for (const [source,output,width,height] of [
    ['public/cards/charizard-expedition-reverse/reverse-foil.svg','40-legacy-reverse.png',1200,1650],
    ['public/cards/charizard-expedition-reverse/laminate.svg','40-legacy-laminate.png',1200,1650],
    ['public/cards/shared/pokemon-ereader-trainer/reverse.svg','trainer-legacy-reverse.png',600,825],
    ['public/cards/shared/pokemon-ereader-trainer/laminate.svg','trainer-legacy-laminate.png',600,825],
  ]) {
    const svg = await read(source,'utf8');
    const data = await page.evaluate(async ({svg,width,height}) => {
      const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width=width; canvas.height=height;
      canvas.getContext('2d').drawImage(image,0,0,width,height); return canvas.toDataURL('image/png').split(',')[1];
    },{svg,width,height});
    await write(`public/cards/pokemon/expedition/maps/${output}`,Buffer.from(data,'base64'));
  }
} finally { await browser.close(); }
