import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { contours } from './contours.mjs';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(root)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = join(root, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage();
  await mkdir('artifacts/base-set/masks', { recursive: true });
  for (const c of contours) {
    const svg = await readFile(`artifacts/base-set/drafts/${c.number}.svg`, 'utf8');
    const data = await page.evaluate(async svg => {
      const img = new Image(); img.src = `data:image/svg+xml;base64,${btoa(svg)}`; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1650;
      canvas.getContext('2d').drawImage(img, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    }, svg);
    await writeFile(`artifacts/base-set/masks/${String(c.number).padStart(2,'0')}.png`, Buffer.from(data, 'base64'));
    const seed = await page.evaluate(c => {
      const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 825;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = 'black'; ctx.fillRect(0,0,600,825);
      ctx.fillStyle = 'white';
      for (const d of c.subject) ctx.fill(new Path2D(d));
      ctx.fillStyle = 'black'; for (const d of c.holes ?? []) ctx.fill(new Path2D(d));
      return canvas.toDataURL('image/png').split(',')[1];
    }, c);
    await writeFile(`artifacts/base-set/masks/${String(c.number).padStart(2,'0')}-seed.png`, Buffer.from(seed, 'base64'));
    const veil = await page.evaluate(c => {
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1650;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = 'black'; ctx.fillRect(0,0,1200,1650);
      ctx.scale(2,2); ctx.fillStyle = 'white';
      for (const d of c.translucent ?? []) ctx.fill(new Path2D(d));
      return canvas.toDataURL('image/png').split(',')[1];
    }, c);
    await writeFile(`artifacts/base-set/masks/${String(c.number).padStart(2,'0')}-veil.png`, Buffer.from(veil, 'base64'));
  }
} finally { await browser.close(); }
