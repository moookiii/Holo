import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const data=path.join(root,'research/reverse-ink');
const selection=JSON.parse(await readFile(path.join(data,'references/selected-sources.json'),'utf8'));
const families=process.argv[2] ? selection.families.filter(f=>f.family===process.argv[2]) : selection.families;
if(!families.length) throw new Error('Unknown family');
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try {
 const page=await browser.newPage({viewport:{width:1560,height:1500},deviceScaleFactor:1});
 const thumbnails=[];
 for(const {family,source} of families){
  const out=path.join(data,'review/full-card',family);
  const svg=await readFile(path.join(root,`assets/reverse-ink/sv/drafts/full-card/${family}.svg`),'utf8');
  const outline=await readFile(path.join(out,'boundaries.svg'),'utf8');
  const photo=`data:image/png;base64,${(await readFile(path.join(out,'reference.png'))).toString('base64')}`;
  const html=`<meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:18px;background:#f1f1ec;font:16px Arial;color:#292e28}h1{font-size:23px;margin:0 0 9px}p{margin:0 0 17px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.card{position:relative;aspect-ratio:630/880;background:#e5e6de;color:#626a60}.card>*{position:absolute;width:100%;height:100%;inset:0}.title{margin-bottom:8px}.ink{background:repeating-conic-gradient(#e9eae4 0% 25%,#f7f7f3 0% 50%) 0/18px 18px}.legend{margin-top:14px;line-height:1.6}</style><h1>${family} / ${source} — full-card first pass</h1><p>One selected reference. Pink: observed contours. Ochre dashed: interpolation. Transparent concealed regions remain unknown.</p><div class="grid"><section><div class="title">Normalized reference</div><div class="card"><img src="${photo}"></div></section><section><div class="title">Exported single-color ink SVG</div><div class="card ink">${svg}</div></section><section><div class="title">Full-card boundary overlay</div><div class="card"><img src="${photo}">${outline}</div></section></div><p class="legend">Header · side strips · lower body · footer. No foil, lighting, card foreground, or runtime protection layer.<br>Full-card coordinates do not imply recovered artwork behind the illustration or opaque Trainer header.</p>`;
  await page.setContent(html);
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
  await page.screenshot({path:path.join(out,'comparison.png'),fullPage:true});
  await page.locator('.ink').screenshot({path:path.join(out,'ink.png')});
  await page.locator('.card').nth(2).screenshot({path:path.join(out,'overlay.png')});
  thumbnails.push([family,svg]);
  console.log(`${family}: exported SVG and complete selected reference reviewed together`);
 }
 if(!process.argv[2]){
  await page.setContent(`<meta charset="utf-8"><style>body{background:#efefe9;color:#636b60;font:20px Arial;margin:20px}h1{color:#242a23}main{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}figure{margin:0}svg{width:100%;background:#fbfbf7}figcaption{padding:8px;color:#242a23}</style><h1>Scarlet & Violet printed ink — eleven full-card first passes</h1><p>Transparent regions are unknown, not asserted empty ink.</p><main>${thumbnails.map(([f,s])=>`<figure><figcaption>${f}</figcaption>${s}</figure>`).join('')}</main>`);
  await page.screenshot({path:path.join(data,'review/full-card/families.png'),fullPage:true});
 }
}finally{await browser.close();}
