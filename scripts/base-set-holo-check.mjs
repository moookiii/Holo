import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { contours } from './base-set/contours.mjs';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const v of (await readdir(root)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const p = join(root, v, 'chrome-win64', 'chrome.exe');
    if (existsSync(p)) { executablePath = p; break; }
  }
}
const backend = process.env.HOLO_BACKEND || 'webgl';
const out = `artifacts/base-set/${backend}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 850, height: 1050 } });
const errors = [], report = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
try {
  await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  await page.evaluate(() => window.__holo.hideUI());
  for (const card of contours.filter(c => !process.env.BASE_CARD || c.slug === process.env.BASE_CARD)) {
    await page.evaluate(async id => { await window.__holo.setCard(id); window.__holo.pose(0,0); }, `${card.slug}-base-set`);
    const samples = await page.evaluate(card => {
      const image = window.__holo.material().coverageTextureNode.value.image;
      const sample = ([x,y]) => image.data[(Math.floor(y/825*image.height)*image.width + Math.floor(x/600*image.width))*4];
      let outside = 0, secondary = 0;
      for (let y=0;y<image.height;y++) for (let x=0;x<image.width;x++) {
        const p=(y*image.width+x)*4;
        if (x/image.width<63/600 || x/image.width>539/600 || y/image.height<99/825 || y/image.height>425/825) outside += image.data[p];
        secondary += image.data[p+1]+image.data[p+2];
      }
      return { print: card.probes.print.map(sample), foil: card.probes.foil.map(sample), outside, secondary };
    }, card);
    for (const [name,yaw,pitch] of [['front',0,0],['left',-14,8],['right',14,-8]]) {
      await page.evaluate(([y,p])=>window.__holo.pose(y,p),[yaw,pitch]);
      await page.waitForTimeout(220);
      await page.screenshot({path:`${out}/${String(card.number).padStart(2,'0')}-${name}.png`});
    }
    report.push({ number: card.number, name: card.name, samples, stats: await page.evaluate(()=>window.__holo.stats()) });
    console.log(card.name, JSON.stringify(samples));
  }
  await writeFile(`${out}/report.json`,JSON.stringify({report,errors},null,2));
  assert.deepEqual(errors,[]);
  for (const {name,samples,stats} of report) {
    assert.equal(stats.profile,'pokemon-galaxy-star');
    assert.equal(samples.outside,0,`${name}: foil escaped artwork`);
    assert.equal(samples.secondary,0,`${name}: unintended metal/secondary foil`);
    assert.ok(samples.print.every(v=>v<4),`${name}: printed subject contaminated: ${samples.print}`);
    assert.ok(samples.foil.every(v=>v>250),`${name}: background incorrectly protected: ${samples.foil}`);
  }
} finally { await browser.close(); }
