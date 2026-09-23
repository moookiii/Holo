import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const family=process.argv[2];
if(!/^[a-z]+$/.test(family||'')) throw new Error('Pass a family id');
const out=path.join(root,`research/reverse-ink/review/patterns/${family}-network-body`);
const report=JSON.parse(await readFile(path.join(out,'review.json'),'utf8'));
const ink=await readFile(path.join(root,`assets/reverse-ink/sv/drafts/${family}-network-body.svg`),'utf8');
const outline=await readFile(path.join(out,'boundaries.svg'),'utf8');
const image=async name=>`data:image/png;base64,${(await readFile(path.join(out,`${name}-source.png`))).toString('base64')}`;
const tiles=[['Independent ink geometry — candidate',ink,'ink']];
for(const name of report.sources) {
  const photo=`<img src="${await image(name)}">`;
  tiles.push([`${name}: original registered source`,photo,`${name}-plain`]);
  tiles.push([`${name}: cell boundaries + repeated Metal glyphs`,photo+outline,`${name}-overlay`]);
}
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try {
  const page=await browser.newPage({viewport:{width:1760,height:1100},deviceScaleFactor:1});
  await page.setContent(`<meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:16px;background:#f4f4ef;color:#70776c;font:18px Arial}h1{font-size:24px;color:#242b21;margin:0 0 8px}p{color:#51584d;margin:0 0 18px}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}figcaption{margin-bottom:8px;color:#242b21}.panel{position:relative;aspect-ratio:569/296;background:#e9e9de}.panel img,.panel svg{position:absolute;display:block;width:100%;height:100%}</style><h1>${family}: independently reconstructed lower body</h1><p>Pink: cell boundaries. Teal: repeated glyphs. Dashed: text interpolation. Candidate, not a completed card-space master.</p><main>${tiles.map(([label,content])=>`<figure><figcaption>${label}</figcaption><div class="panel">${content}</div></figure>`).join('')}</main>`);
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(im=>im.decode())));
  await page.screenshot({path:path.join(out,'comparison.png'),fullPage:true});
  for(let i=0;i<tiles.length;i++) await page.locator('figure').nth(i).locator('.panel').screenshot({path:path.join(out,`${tiles[i][2]}.png`)});
  console.log(`Rendered ${family} SVG and ${report.sources.length} source overlays`);
} finally {await browser.close();}
