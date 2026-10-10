import { chromium } from 'playwright';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const out = join(process.cwd(), 'artifacts/swsh-materials/live');
await mkdir(out, { recursive: true });
const options = { headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] };
if (!existsSync(chromium.executablePath())) {
  const base = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const dir of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const exe = join(base, dir, 'chrome-win64/chrome.exe');
    if (existsSync(exe)) { options.executablePath = exe; break; }
  }
}
const browser = await chromium.launch(options);
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
const errors = [], report = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
try {
  await page.goto(process.env.HOLO_URL || 'http://127.0.0.1:5173/');
  await page.waitForFunction(() => window.__holo?.gallery.instance()?.active, null, { timeout: 90000 });
  await page.evaluate(async () => { await window.__holo.gallery.close(); window.__holo.hideUI(); });
  for (const finish of (process.env.REVIEW_FINISHES || 'reverse').split(',')) {
    const id = finish.startsWith('pokemon:') ? finish : `swsh-proof:${finish}`;
    await page.evaluate(async id => { await window.__holo.setCard(id); }, id);
    const prefix = finish.replaceAll(':', '-');
    for (const [name, light, yaw, pitch, phase] of [
      ['front', 'Studio', 0, 0, 0], ['left', 'Studio', -25, 4, 0],
      ['right', 'Studio', 25, -4, 0], ['specular', 'Strip', -15, -15, 0],
      ['grazing', 'Strip', 65, 0, 0], ['dark', 'Low key', 8, 0, 0],
      ['moving-a', 'Moving light', 0, 0, .3], ['moving-b', 'Moving light', 0, 0, 2.3],
    ]) {
      await page.evaluate(([light, yaw, pitch, phase]) => {
        const h = window.__holo; h.lighting.setPreset(light); h.lighting.playing = false;
        h.lighting.phase = phase; h.lighting.update(0); h.pose(yaw, pitch, 0);
      }, [light, yaw, pitch, phase]);
      await page.waitForTimeout(350);
      await page.screenshot({ path: join(out, `${prefix}-${name}.png`) });
    }
    // Actual continuous pose sweep; store frames for a repeatable motion review.
    for (let step = 0; step <= 12; step++) {
      await page.evaluate(step => { const h = window.__holo; h.lighting.setPreset('Studio');
        h.lighting.playing = false; h.pose(-30 + step * 5, 8 * Math.sin(step / 12 * Math.PI), 0); }, step);
      await page.waitForTimeout(65);
      await page.screenshot({ path: join(out, `${prefix}-motion-${String(step).padStart(2, '0')}.png`) });
    }
    report.push({ id, states: 8, motionFrames: 13, stats: await page.evaluate(() => window.__holo.stats()) });
    console.log('Reviewed', id);
  }
} finally {
  await writeFile(join(out, `report-${(process.env.REVIEW_FINISHES || 'reverse').replaceAll(':', '-').replaceAll(',', '-')}.json`), JSON.stringify({ report, errors }, null, 2));
  await browser.close();
}
if (errors.length) throw new Error(errors.join('\n'));
