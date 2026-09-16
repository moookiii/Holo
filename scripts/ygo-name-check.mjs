import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const path = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(path)) { executablePath = path; break; }
  }
}
const out = 'artifacts/ygo-name-check';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const report = [];
try {
  for (const backend of ['webgpu', 'webgl']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
    await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
    const shot = async name => {
      await page.waitForTimeout(350);
      const bytes = await page.screenshot({ path: name ? `${out}/${backend}-${name}.png` : undefined });
      return bytes;
    };
    for (const [card, profile] of [['dark-magician-girl', 'ygo-ultra'], ['blue-eyes', 'ygo-secret'], ['effect-veiler-ra01', 'ygo-quarter-century']]) {
      await page.evaluate(async ([card, profile]) => {
        const h = window.__holo; await h.setCard(card); await h.setProfile(profile); h.hideUI(); h.setMode('rotate'); h.pose(0, 0); h.zoom(1);
      }, [card, profile]);
      await page.waitForTimeout(2000);
      const front = await shot(`${card}-front`);
      assert.ok(front.equals(await shot()), 'stationary lettering must not flicker');
      await page.evaluate(() => { window.__holo.material().nameRecess.strength.value = 0; });
      assert.ok(!front.equals(await shot(`${card}-flat`)), 'recess must visibly change lettering');
      await page.evaluate(() => { window.__holo.material().nameRecess.strength.value = 1; window.__holo.pose(-25, -18); });
      const tilted = await shot(`${card}-tilted`);
      await page.evaluate(() => { window.__holo.material().nameRecess.parallax.value = 0; });
      assert.ok(!tilted.equals(await shot(`${card}-no-parallax`)), 'parallax must change the oblique cavity');
      await page.evaluate(() => { window.__holo.material().nameRecess.parallax.value = 1; window.__holo.pose(0, 0); });
      assert.ok(front.equals(await shot()), 'returning orientation must restore the same lettering');
      report.push({ backend, card, profile, stationary: true, recess: true, parallax: true, restored: true });
      console.log(JSON.stringify(report.at(-1)));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.__holo.pose(18, -10));
    await shot('mobile');
    assert.deepEqual(errors, [], 'both renderers must compile without errors');
    await page.close();
  }
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
} finally { await browser.close(); }

