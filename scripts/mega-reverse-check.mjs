import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) for (const version of (await readdir(join(process.env.LOCALAPPDATA, 'ms-playwright'))).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
  const path = join(process.env.LOCALAPPDATA, 'ms-playwright', version, 'chrome-win64/chrome.exe');
  if (existsSync(path)) { executablePath = path; break; }
}
const out = 'artifacts/mega-reverse';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const results = [], errors = [];
try {
  for (const backend of ['webgpu', 'webgl']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400 && r.url().includes('/cards/')) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(`${process.env.HOLO_URL ?? 'http://127.0.0.1:5174/'}?backend=${backend}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__holo?.ready && window.__holo.startupTiming.galleryUIAvailable !== undefined, null, { timeout: 120000 });
    for (const id of ['pokemon:me03-063:reverse', 'pokemon:me01-001:reverse']) {
      await page.evaluate(id => window.__holo.gallery.close(id), id);
      await page.waitForFunction(id => window.__holo.stats().card === id, id, { timeout: 120000 });
      assert.equal(await page.evaluate(() => window.__holo.stats().profile), 'mega-standard-reverse');
      await page.evaluate(() => window.__holo.hideUI());
      for (const [name, yaw, pitch, preset] of [['front', 0, 0, 'Studio'], ['grazing', 55, -15, 'Studio'], ['specular', -15, -15, 'Studio'], ['tilt', -28, 24, 'Studio'], ['dark', 0, 0, 'Low key'], ['moving-a', 0, 0, 'Moving light'], ['moving-b', 0, 0, 'Moving light']]) {
        await page.evaluate(([y, p, preset]) => { window.__holo.pose(y, p, 0); window.__holo.lighting.setPreset(preset); }, [yaw, pitch, preset]);
        await page.waitForTimeout(name === 'moving-b' ? 1100 : 450);
        await page.screenshot({ path: `${out}/${backend}-${id.split(':')[1]}-${name}.png` });
      }
      results.push(await page.evaluate(() => window.__holo.stats()));
      if (id.includes('me03-063')) {
        await page.evaluate(() => {
          const h = window.__holo, l = h.lighting;
          h.pose(0, 0, 0); l.setPreset('Studio');
          l.key.position.set(8, 3, 12); l.key.lookAt(0, 0, 0);
          l.key.width = .7; l.key.height = 1.4; l.key.intensity = 115;
          l.strip.intensity = .25; l.fill.intensity = .3; h.scene.environmentIntensity = .35;
        });
        await page.waitForTimeout(450);
        await page.screenshot({ path: `${out}/${backend}-me03-063-photo-light.png` });
      }
      // Same exact front and coverage, with the previous smooth response.
      await page.evaluate(async () => { window.__holo.lighting.setPreset('Studio'); window.__holo.pose(-15, -15, 0); await window.__holo.setProfile('sv_tcgl_standard_reverse'); });
      await page.waitForTimeout(450);
      await page.screenshot({ path: `${out}/${backend}-${id.split(':')[1]}-previous.png` });
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ out, cards: results.length, errors }));
