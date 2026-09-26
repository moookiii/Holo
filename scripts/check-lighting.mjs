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
  await page.click('#light-toggle');
  for (const mode of ['Moving light', 'Blacklight', 'Skim', 'Holo skim', 'Spotlight', 'Right light', 'Polarizer', 'Studio']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    if (mode === 'Polarizer') await page.getByRole('slider', { name: 'Filter rotation' }).fill('90');
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(out, `${mode.replaceAll(' ', '-')}.png`) });
  }
  console.log(JSON.stringify({ stats: await page.evaluate(() => window.__holo.stats()), errors, warnings }, null, 2));
  await writeFile(join(out, 'report.json'), JSON.stringify({ stats: await page.evaluate(() => window.__holo.stats()), errors, warnings }, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  await page.screenshot({ path: join(out, 'failure.png') });
  console.log(JSON.stringify({ failure: String(error), errors, warnings }, null, 2));
  process.exitCode = 1;
} finally { await browser.close(); }
