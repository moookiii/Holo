// Render all eleven assembled pattern drafts from the actual SVG files.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const index=JSON.parse(await readFile(path.join(root,'assets/reverse-ink/sv/index.json'),'utf8'));
const tiles=await Promise.all(index.families.map(async family=>{
  const svg=await readFile(path.join(root,'assets/reverse-ink/sv',family.pattern_draft));
  const note=family.symbol_status==='rejected-needs-retrace'?' · glyph pending':'';
  return `<figure><figcaption>${family.label}${note}</figcaption><img alt="${family.label}" src="data:image/svg+xml;base64,${svg.toString('base64')}"></figure>`;
}));
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try {
  const page=await browser.newPage({viewport:{width:1500,height:1200},deviceScaleFactor:1});
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;padding:24px;background:#e8e9eb;color:#20262b;font:18px Arial}
  h1{font-size:26px;font-weight:500;margin:0 0 8px}p{margin:0 0 20px}
  main{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}figure{margin:0;padding:12px;background:white}
  figcaption{margin-bottom:8px}img{display:block;width:100%;background:#fff}
  </style><h1>Rejected eleven-family pebble drafts</h1><p>These blob contours miss the connected dark ink bands. Retained for comparison only. See dark-network-correction/comparison.png for the corrected bounded detail.</p><main>${tiles.join('')}</main>`);
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.screenshot({path:path.join(root,'research/reverse-ink/review/patterns/families.png'),fullPage:true});
  for (const family of index.families) {
    const figure=page.locator('figure').filter({has:page.getByAltText(family.label,{exact:true})});
    await figure.screenshot({path:path.join(root,`research/reverse-ink/review/patterns/${family.id}-draft.png`)});
  }
  console.log(`Rendered ${index.families.length} assembled pattern SVGs`);
} finally {await browser.close();}
