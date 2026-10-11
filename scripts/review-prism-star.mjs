import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const out = 'artifacts/prism-star/viewer';
await mkdir(out, { recursive: true });
const options = { headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] };
if (!existsSync(chromium.executablePath())) {
  const base = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const executable = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(executable)) { options.executablePath = executable; break; }
  }
}
const browser = await chromium.launch(options);
const page = await browser.newPage({ viewport: { width: 1100, height: 1100 }, recordVideo: { dir: out, size: { width: 1100, height: 1100 } } });
const errors = [], results = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  for (const id of ['sm5-58', 'sm5-120', 'sm5-136']) {
    await page.evaluate(async id => {
      await window.__holo.gallery.close(`pokemon:${id}:holo`);
      window.__holo.hideUI();
      window.__holo.lighting.playing = false;
    }, id);
    for (const [label, light, yaw, pitch] of [
      ['front', 'Studio', 0, 0], ['left', 'Studio', -18, 0], ['right', 'Studio', 18, 0],
      ['reflection', 'Strip', -15, -15], ['soft', 'Soft', 0, 12],
      ['dark', 'Low key', 0, 0], ['grazing', 'Studio', 65, 0],
    ]) {
      await page.evaluate(([light, yaw, pitch]) => { window.__holo.lighting.setPreset(light); window.__holo.pose(yaw, pitch); }, [light, yaw, pitch]);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${out}/${id}-${label}.png` });
    }
    await page.evaluate(() => { window.__holo.pose(0, 0); window.__holo.lighting.setPreset('Moving light'); window.__holo.lighting.playing = true; });
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(850);
      await page.screenshot({ path: `${out}/${id}-moving-${i}.png` });
    }
    results.push(await page.evaluate(() => window.__holo.stats()));
  }
  await writeFile(`${out}/report.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ cards: results.map(s => ({ card: s.card, profile: s.profile, backend: s.backend, frameMs: s.frameMs })), errors }, null, 2));
  if (errors.length) process.exitCode = 1;
} finally {
  const video = page.video();
  await page.close();
  await video.saveAs(`${out}/review.webm`);
  await browser.close();
}
