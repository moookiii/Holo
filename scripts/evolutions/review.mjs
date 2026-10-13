import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const version of (await readdir(root)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = join(root, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const out = `artifacts/evolutions/viewer${process.env.REVIEW_SUFFIX || ''}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
const errors = [], results = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('response', r => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) errors.push(`${r.status()} ${r.url()}`); });
try {
  await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  await page.waitForFunction(() => window.__holo?.gallery.stats()?.active, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { window.__holo.hideUI(); window.__holo.lighting.playing = false; });
  const ids = process.env.REVIEW_CARDS?.split(',') || [11,15,25,34,36,38,42,45,53,59,62,63,70].map(n => `pokemon:xy12-${n}:holo`);
  for (const id of ids) {
    const start = performance.now();
    await page.evaluate(async id => { if (window.__holo.gallery.stats()?.active) await window.__holo.gallery.close(id); else await window.__holo.setCard(id); window.__holo.zoom(.85); window.__holo.lighting.playing = false; }, id);
    await page.waitForFunction(id => window.__holo.stats().card === id, id, { timeout: 120000 });
    assert.equal(await page.evaluate(() => window.__holo.stats().card), id);
    for (const [label, light, yaw, pitch] of [
      ['front','Studio',0,0], ['tilt','Studio',-18,-12], ['specular','Strip',18,9],
      ['dark','Low key',0,0], ['grazing','Studio',60,0],
    ]) {
      await page.evaluate(([light,yaw,pitch]) => { window.__holo.lighting.setPreset(light); window.__holo.pose(yaw,pitch); }, [light,yaw,pitch]);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${out}/${id.replaceAll(':','-')}-${label}.png` });
    }
    await page.evaluate(() => { window.__holo.pose(0,0); window.__holo.lighting.setPreset('Moving light'); window.__holo.lighting.playing = true; });
    for (let i=0;i<3;i++) { await page.waitForTimeout(650); await page.screenshot({ path: `${out}/${id.replaceAll(':','-')}-moving-${i}.png` }); }
    const stats = await page.evaluate(() => window.__holo.stats());
    results.push({ id, loadAndReviewMs: performance.now()-start, stats });
    await writeFile(`${out}/report.json`, JSON.stringify({results,errors},null,2));
    console.log(JSON.stringify({id,profile:stats.profile,backend:stats.backend,frameMs:stats.frameMs}));
  }
  await page.evaluate(async () => { window.__holo.lighting.setPreset('Studio'); window.__holo.lighting.playing=false; await window.__holo.gallery.open(); });
  await page.locator('select').evaluateAll(selects => {
    const set=selects.find(s=>[...s.options].some(o=>o.value==='Evolutions'));
    if (!set) throw new Error('Evolutions gallery set filter missing');
    set.value='Evolutions'; set.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(() => { const s=window.__holo.gallery.stats(); return s?.active && s.filtered===196 && s.visible===s.visibleExpected && !s.visibleFailed && s.visible>0; },null,{timeout:120000});
  await page.screenshot({path:`${out}/gallery.png`});
  const gallery=await page.evaluate(()=>window.__holo.gallery.stats());
  await writeFile(`${out}/report.json`,JSON.stringify({results,gallery,errors},null,2));
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }
