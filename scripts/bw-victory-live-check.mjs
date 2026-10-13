import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const v of (await readdir(root)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const p = join(root, v, 'chrome-win64/chrome.exe');
    if (existsSync(p)) { executablePath = p; break; }
  }
}
const out = 'artifacts/bw-victory/live';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
const errors = [], cards = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) errors.push(`${r.status()} ${r.url()}`); });
try {
  await page.goto(process.env.HOLO_URL || 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  await page.evaluate(() => window.__holo.gallery.open());
  await page.waitForFunction(() => window.__holo?.gallery.stats()?.active, null, { timeout: 120000 });
  for (const n of [29,30,31]) {
    const id = `pokemon:bwbsp-${n}:holo`;
    await page.evaluate(async id => await window.__holo.gallery.close(id), id);
    await page.waitForFunction(id => window.__holo?.stats?.().card === id, id, { timeout: 120000 });
    await page.evaluate(() => { window.__holo.hideUI(); window.__holo.zoom(.8); });
    const definition = await page.evaluate(id => {
      const c = window.__holo.cards.find(c => c.id === id);
      return { profile: c.profile, number: c.number, maps: c.maps };
    }, id);
    assert.equal(definition.profile, 'pokemon-crosshatch');
    assert.doesNotMatch(definition.number, /pending/);
    for (const [name, light, yaw, pitch] of [['front','Studio',0,0],['tilt','Studio',18,-8],['skim','Holo skim',-20,12],['dark','Low key',0,0],['moving','Moving light',10,0]]) {
      await page.evaluate(([light,yaw,pitch]) => { window.__holo.lighting.setPreset(light); window.__holo.pose(yaw,pitch,0); }, [light,yaw,pitch]);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${out}/${n}-${name}.png` });
    }
    cards.push({ id, ...definition, stats: await page.evaluate(() => window.__holo.stats()) });
    console.log('Reviewed', id);
  }
  await writeFile(`${out}/report.json`, JSON.stringify({ cards, errors }, null, 2));
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
