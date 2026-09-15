import { chromium } from 'playwright';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const out = join(process.cwd(), 'artifacts', process.env.CAPTURE_NAME || 'current');
await mkdir(out, { recursive: true });
const opts = { headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] };
if (process.env.BROWSER_EXECUTABLE) opts.executablePath = process.env.BROWSER_EXECUTABLE;
else if (!existsSync(chromium.executablePath())) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const versions = (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse();
  for (const version of versions) {
    const path = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(path)) { opts.executablePath = path; break; }
  }
}
const browser = await chromium.launch(opts);
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
const errors = [], warnings = [];
page.on('pageerror', error => errors.push(error.stack));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); else if (message.type() === 'warning') warnings.push(message.text()); });
const query = process.env.CAPTURE_QUERY || '';
try {
  await page.goto(`http://127.0.0.1:5173/${query}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  if (process.env.CAPTURE_CARD) await page.evaluate(id => window.__holo.setCard(id), process.env.CAPTURE_CARD);
  if (process.env.CAPTURE_PROFILE) await page.evaluate(id => window.__holo.setProfile(id), process.env.CAPTURE_PROFILE);
  if (process.env.CAPTURE_ZOOM) await page.evaluate(value => window.__holo.zoom(value), Number(process.env.CAPTURE_ZOOM));
  if (process.env.CAPTURE_LIGHT) await page.evaluate(value => window.__holo.lighting.setPreset(value), process.env.CAPTURE_LIGHT);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(out, 'presentation.png') });
  await page.evaluate(() => window.__holo.hideUI());
  const angles = process.env.CAPTURE_REVIEW ? [['front', 0, 0, 0], ['yaw-12', -12, 0, 0], ['yaw+12', 12, 0, 0], ['pitch-10', 0, -10, 0], ['pitch+10', 0, 10, 0], ['reflection', -15, -15, 0], ['diagonal', -28, 24, 20], ['grazing', 88, 0, 0]] : process.env.CAPTURE_IDS ? [['front', 0, 0, 0], ['yaw-15', -15, 0, 0], ['reflection', -15, -15, 0], ['diagonal', -28, 24, 20], ['yaw+30', 30, 0, 0]] : process.env.CAPTURE_PROFILES ? [['front', 0, 0, 0], ['yaw-15', -15, 0, 0], ['diagonal', -28, 24, 20]] : process.env.CAPTURE_QUICK ? [['front', 0, 0, 0]] : [
    ['front', 0, 0, 0], ['yaw-15', -15, 0, 0], ['yaw+15', 15, 0, 0], ['yaw+30', 30, 0, 0],
    ['yaw+60', 60, 0, 0], ['pitch-30', 0, -30, 0], ['pitch+30', 0, 30, 0],
    ['diagonal', -28, 24, 20], ['grazing', 88, 0, 0], ['back', 180, 0, 0],
  ];
  const profiles = process.env.CAPTURE_IDS ? process.env.CAPTURE_IDS.split(',') : process.env.CAPTURE_PROFILES ? await page.evaluate(family => window.__holo.profiles.filter(p => p.family === family).map(p => p.id), process.env.CAPTURE_FAMILY || 'Original') : [undefined];
  const lights = process.env.CAPTURE_LIGHTS ? ['Studio', 'Strip', 'Soft', 'Low key'] : [undefined];
  for (const light of lights) {
  if (light) await page.evaluate(value => window.__holo.lighting.setPreset(value), light);
  for (const profile of profiles) {
    if (profile) await page.evaluate(id => window.__holo.setProfile(id), profile);
    for (const [name, yaw, pitch, roll] of angles) {
      await page.evaluate(([y, p, r]) => window.__holo.pose(y, p, r), [yaw, pitch, roll]);
      await page.waitForTimeout(160);
      await page.screenshot({ path: join(out, `${light ? light.toLowerCase().replaceAll(' ', '-') + '-' : ''}${profile ? profile + '-' : ''}${name}.png`) });
    }
  }
  }
  console.log(JSON.stringify({ stats: await page.evaluate(() => window.__holo.stats()), errors, warnings }, null, 2));
  await writeFile(join(out, 'report.json'), JSON.stringify({ stats: await page.evaluate(() => window.__holo.stats()), errors, warnings }, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  await page.screenshot({ path: join(out, 'failure.png') });
  console.log(JSON.stringify({ failure: String(error), errors, warnings }, null, 2));
  process.exitCode = 1;
} finally { await browser.close(); }
