import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const version of (await readdir(root)).filter(name => /^chromium-\d+$/.test(name)).sort().reverse()) {
    const path = join(root, version, 'chrome-win64/chrome.exe');
    if (existsSync(path)) { executablePath = path; break; }
  }
}
const out = 'artifacts/viewer-orientation';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true,
  args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(120000);
const errors = [], results = [];
page.on('pageerror', error => errors.push(error.message));
const sideways = ['pokemon:xy12-46:holo', 'pokemon:xybsp-154:holo',
  'pokemon:30th-classic-022:holo', 'pokemon:30th-classic-016:holo', 'pokemon:30th-classic-017:holo'];
const waitForRoll = roll => page.waitForFunction(roll => {
  const q = window.__holo.stats().quaternion;
  const dot = q[2] * Math.sin(roll / 2) + q[3] * Math.cos(roll / 2);
  return Math.abs(dot) > 1 - 1e-10;
}, roll);
try {
  await page.goto(process.env.HOLO_URL || 'http://127.0.0.1:5173/?backend=webgl&benchmark-cold-viewer',
    { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__holo?.ready && window.__holo.gallery.stats()?.active);
  const catalog = await page.evaluate(async () => {
    const { viewerCardRoll } = await import('/src/card/CardOrientation.ts');
    return window.__holo.cards.filter(card => viewerCardRoll(card) !== 0).map(card => ({ id: card.id, title: card.title }));
  });
  await writeFile(join(out, 'sideways-catalog.json'), JSON.stringify(catalog, null, 2));
  console.log(`Found ${catalog.length} sideways gallery cards`);
  for (const id of [...sideways, 'pokemon:xy12-109:normal']) {
    const roll = sideways.includes(id) ? -Math.PI / 2 : 0;
    await page.evaluate(id => window.__holo.gallery.close(id), id);
    await waitForRoll(roll);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#loading')).opacity === '0');
    await page.evaluate(() => { window.__holo.lighting.playing = false; });
    const capture = join(out, id.replaceAll(':', '-') + '.png');
    await page.screenshot({ path: capture });
    await page.evaluate(() => { window.__holo.pose(17, -9, 23); window.__holo.flip(); });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.__holo.reset());
    await waitForRoll(roll);
    const stats = await page.evaluate(() => {
      const h = window.__holo;
      const mesh = h.scene.children.find(object => Array.isArray(object.material) && object.material[0] === h.material());
      return { ...h.stats(), meshQuaternion: mesh?.quaternion.toArray() };
    });
    assert.equal(stats.card, id);
    assert.deepEqual(stats.meshQuaternion, stats.quaternion, 'mesh and camera use the motion orientation');
    results.push({ id, rollDegrees: roll * 180 / Math.PI, quaternion: stats.quaternion, capture });
    console.log(`Verified opening and reset: ${id}`);
  }
  // A direct picker change must clear the landscape default as well.
  await page.evaluate(id => window.__holo.setCard(id), sideways[0]);
  await waitForRoll(-Math.PI / 2);
  await page.evaluate(() => window.__holo.setCard('pokemon:xy12-109:normal'));
  await waitForRoll(0);
  assert.deepEqual(errors, []);
} catch (error) {
  results.push({ failure: String(error) });
  await page.screenshot({ path: join(out, 'failure.png') }).catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ results, errors }, null, 2));
