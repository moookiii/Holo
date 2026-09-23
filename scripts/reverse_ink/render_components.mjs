// Render the actual SVG exports, independently of the Python overlay drawing.
import { chromium } from 'playwright';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const folder = path.join(root, 'assets/reverse-ink/sv/components');
const out = path.join(root, 'research/reverse-ink/review/symbols');
const files = (await readdir(folder)).filter(name => name.endsWith('-symbol.svg')).sort();
const tiles = await Promise.all(files.map(async name => {
  const contents = await readFile(path.join(folder, name));
  return `<figure><figcaption>${name.replace('-symbol.svg', '')}</figcaption><img alt="${name}" src="data:image/svg+xml;base64,${contents.toString('base64')}"></figure>`;
}));
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;padding:24px;background:#eee;color:#181c20;font:15px Arial}
    h1{font-size:22px;font-weight:500;margin:0 0 10px}p{margin:0 0 25px}
    main{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    figure{margin:0;padding:12px;background:white}figcaption{text-transform:capitalize;margin-bottom:10px}
    img{width:100%;aspect-ratio:1;background:repeating-conic-gradient(#fff 0% 25%,#e9ecee 0% 50%) 0 0/16px 16px}
  </style><h1>Reconstructed symbol components</h1><p>Actual SVG exports · monochrome geometry · incomplete family masters</p><main>${tiles.join('')}</main>`);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  const failed = await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || !image.naturalWidth).length);
  if (failed) throw new Error(`${failed} SVGs failed browser decoding`);
  await mkdir(out, { recursive: true });
  await page.screenshot({ path: path.join(out, 'components.png'), fullPage: true });
  console.log(`Rendered and decoded ${files.length} actual SVG components`);
} finally {
  await browser.close();
}
