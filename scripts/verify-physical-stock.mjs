import { chromium } from 'playwright';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const out = join(process.cwd(), 'artifacts', process.env.CAPTURE_NAME || 'physical-stock');
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
const cases = ['common-pokemon-bulbasaur', 'magic:lea:1', 'alakazam-base-set', 'common-yugioh-kuriboh'];
try {
  await page.goto(process.env.STOCK_REVIEW_URL || 'http://127.0.0.1:4174/Holo/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__holo.gallery.stats().pending === 0, null, { timeout: 60000 });
  await page.screenshot({ path: join(out, 'gallery.png') });
  await page.evaluate(() => window.__holo.gallery.close());
  for (const id of cases) {
    await page.evaluate(id => window.__holo.setCard(id), id);
    await page.evaluate(() => { window.__holo.hideUI(); window.__holo.lighting.playing = false; });
    for (const light of ['Studio', 'Skim']) {
      await page.evaluate(light => window.__holo.lighting.setPreset(light), light);
      for (const [name, yaw, pitch, zoom] of [['front',0,0,1], ['tilt',-25,12,1], ['reflection',-15,-20,.7], ['edge',75,8,.6], ['close',-15,-15,.65], ['grazing',85,0,1], ['back',180,0,1]]) {
        await page.evaluate(([yaw,pitch,zoom]) => { window.__holo.pose(yaw,pitch); window.__holo.zoom(zoom); }, [yaw,pitch,zoom]);
        await page.waitForTimeout(350);
        await page.screenshot({ path: join(out, `${id.replaceAll(':','-')}-${light}-${name}.png`) });
        if (id === 'alakazam-base-set' && light === 'Studio' && name === 'reflection') {
          const strength = await page.evaluate(() => { const stock = window.__holo.material().stock; const value = stock.strength.value; stock.strength.value = 0; return value; });
          await page.waitForTimeout(250);
          await page.screenshot({ path: join(out, 'alakazam-no-grain.png') });
          await page.evaluate(value => { window.__holo.material().stock.strength.value = value; }, strength);
        }
      }
    }
  }
  const report = { errors, warnings, stats: await page.evaluate(() => window.__holo.stats()) };
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) { console.error(JSON.stringify({ failure: String(error), errors, warnings })); await page.screenshot({ path: join(out, 'failure.png') }); process.exitCode = 1; } finally { await browser.close(); }
