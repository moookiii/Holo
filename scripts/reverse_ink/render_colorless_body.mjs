import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=path.join(root,'research/reverse-ink/review/patterns/colorless-network-body');
const ink=await readFile(path.join(root,'assets/reverse-ink/sv/drafts/colorless-network-body.svg'),'utf8');
const outline=await readFile(path.join(out,'boundaries.svg'),'utf8');
const image=async name=>`data:image/png;base64,${(await readFile(path.join(out,`${name}-source.png`))).toString('base64')}`;
const tiles=[['Ink geometry — candidate',ink],['Lickitung reference',`<img src="${await image('lickitung')}">`]];
for(const name of ['lickitung','meowth','pidgey']) tiles.push([`${name}: pink observed / ochre text interpolation`,`<img src="${await image(name)}">${outline}`]);
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || 'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1760,height:1100},deviceScaleFactor:1});
  await page.setContent(`<meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:16px;background:#f4f4ef;color:#70776c;font:18px Arial}h1{font-size:24px;color:#242b21;margin:0 0 8px}p{color:#51584d;margin:0 0 18px}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}figcaption{margin-bottom:8px;color:#242b21}.panel{position:relative;aspect-ratio:569/296;background:#e9e9de}.panel img,.panel svg{position:absolute;display:block;width:100%;height:100%}</style><h1>Colorless: connected ink network across the lower body</h1><p>Source-traced candidate. Other card regions and the remaining ten family bodies are still pending.</p><main>${tiles.map(([name,content])=>`<figure><figcaption>${name}</figcaption><div class="panel">${content}</div></figure>`).join('')}</main>`);
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(im=>im.decode())));
  await page.screenshot({path:path.join(out,'comparison.png'),fullPage:true});
  const figures=page.locator('figure');
  const names=['ink','source','lickitung-overlay','meowth-overlay','pidgey-overlay'];
  for(let i=0;i<names.length;i++) await figures.nth(i).locator('.panel').screenshot({path:path.join(out,`${names[i]}.png`)});
  console.log('Rendered actual body SVG and three independently registered source overlays');
}finally{await browser.close();}
