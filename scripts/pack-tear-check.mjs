import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
if (!existsSync(executablePath)) for (const version of (await readdir(base)).filter(v => /^chromium-\d+$/.test(v)).sort().reverse()) {
  const candidate = join(base, version, 'chrome-win64', 'chrome.exe');
  if (existsSync(candidate)) { executablePath = candidate; break; }
}
const backend = process.env.PACK_BACKEND || 'webgpu';
const out = join(process.cwd(), 'artifacts', `localized-tear-${backend}`);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [], captures = [];
page.on('pageerror', error => errors.push(error.stack));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const stats = () => page.evaluate(() => window.__holo.pack.stats());
const point = (x, y) => page.evaluate(([x, y]) => {
  const h = window.__holo, wrapper = h.scene.getObjectByName('Metalized foil wrapper');
  const p = h.camera.position.clone().set(x, y, .02); wrapper.localToWorld(p); p.project(h.camera);
  return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2];
}, [x, y]);
const reset = () => page.evaluate(() => window.__holo.pack.setStage('sealed'));
const begin = async (x, y) => { await page.mouse.move(...await point(x, y)); await page.mouse.down(); };
const move = async (x, y) => { await page.mouse.move(...await point(x, y), { steps: 20 }); await page.waitForTimeout(120); };
const capture = async name => { await page.screenshot({ path: join(out, `${name}.png`) }); captures.push({ name, ...await stats() }); };
try {
  await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  await page.evaluate(() => window.__holo.pack.open('test-pack'));
  await reset(); await capture('sealed');
  await begin(-3.2, 5.3); await move(-2.2, 5.55); await move(-1.2, 5.05); await move(.3, 5.6);
  await capture('curved-grip'); await page.mouse.up(); await page.waitForTimeout(450); await capture('curved-release');
  const curved = await stats();
  assert.equal(curved.state, 'Tear'); assert.ok(curved.tearPath.progress > .45 && curved.tearPath.progress < .65);
  const heights = curved.tearPath.samples.filter((_, index) => index % 4 === 0);
  assert.ok(Math.max(...heights) - Math.min(...heights) > .12, 'the actual pointer path bends the cut');
  await page.waitForTimeout(300); assert.equal((await stats()).tearPath.progress, curved.tearPath.progress, 'release does not heal');
  // Re-grip the intact strip just at the last cut and finish the remaining seam.
  await begin(.3, 5.55); await move(4.5, 5.6); await page.mouse.up();
  await page.waitForFunction(() => window.__holo.pack.stats().state === 'OpenWrapper', null, { timeout: 5000 });
  await capture('regrip-complete');

  await reset(); await begin(3.2, 5.3); await move(.2, 5.55); await capture('right-to-left'); await page.mouse.up();
  const reverse = await stats();
  assert.ok(reverse.tearPath.samples[4 * 140 + 1] > .9 && reverse.tearPath.samples[4 * 4 + 1] === 0, 'reverse tearing starts on the gripped side');

  await reset(); await begin(0, 5.3); await move(.8, 5.7); await capture('middle-grip');
  const center = await stats();
  assert.ok(center.tearPath.progress < .2 && center.tearPath.progress > .08);
  assert.equal(center.tearPath.samples[4 * 20 + 1], 0); assert.equal(center.tearPath.samples[4 * 120 + 1], 0);
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.mouse.up();
  await page.waitForTimeout(300); assert.equal((await stats()).tearPath.progress, center.tearPath.progress);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__holo.pack.stats().state === 'OpenWrapper', null, { timeout: 5000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__holo.pack.stats().state === 'ExtractStack', null, { timeout: 5000 });
  await capture('accessible-open');

  await reset(); await page.evaluate(() => window.__holo.pack.pose(28, 6, 24));
  const orientation = (await stats()).orientation;
  await begin(3.2, 5.3); await move(.3, 5.6); await page.mouse.up(); await capture('rotated-tear');
  assert.ok((await stats()).tearPath.progress > .3, 'the stroke follows a rotated pack');
  assert.deepEqual((await stats()).orientation, orientation, 'gripping preserves pack orientation');

  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await reset(); await page.waitForTimeout(200); await reset();
  await begin(3.2, 5.3); await move(.4, 5.5); await page.mouse.up(); await capture('portrait-tear');
  assert.ok((await stats()).tearPath.progress > .3);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ backend, passed: true, captures: captures.map(({ name, tearPath }) => ({ name, progress: tearPath.progress })), errors }, null, 2));
} catch (error) {
  await page.screenshot({ path: join(out, 'failure.png') });
  console.error(error); console.log(JSON.stringify({ state: await stats(), errors })); process.exitCode = 1;
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify({ backend, passed: process.exitCode !== 1, captures, errors }, null, 2));
  await browser.close();
}
