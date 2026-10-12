import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const v of (await readdir(root)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const p = join(root, v, 'chrome-win64', 'chrome.exe');
    if (existsSync(p)) { executablePath = p; break; }
  }
}
const registry = JSON.parse(readFileSync('scripts/cosmos/registration.json', 'utf8'));
const requested = process.env.COSMOS_IDS?.split(',');
const targets = registry.filter(c => !requested || requested.includes(c.cardId))
  .map(c => ({ key: c.cardId, id: `pokemon:${c.cardId}:holo${c.edition === 'first-edition' ? ':first-edition' : ''}` }));
targets.push({ key: 'base-set-2-reference', id: 'pokemon:base4-1:holo' },
  { key: 'entei-reference', id: 'pokemon:basep-34:holo' });
const out = join(process.cwd(), 'artifacts/cosmos-missing/live');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true,
  args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) errors.push(`${r.status()} ${r.url()}`); });
try {
  await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__holo.gallery.instance()?.openingReady, null, { timeout: 90000 });
  await page.evaluate(id => window.__holo.gallery.close(id), targets[0].id);
  await page.evaluate(() => window.__holo.hideUI());
  for (const { key, id } of targets) {
    await page.evaluate(async id => { await window.__holo.setCard(id); window.__holo.zoom(.85); }, id);
    assert.equal(await page.evaluate(() => window.__holo.stats().card), id);
    assert.equal(await page.evaluate(() => window.__holo.stats().profile), 'pokemon-base-set-2-cosmos');
    for (const [label, yaw, pitch, light] of [
      ['front', 0, 0, 'Studio'], ['tilt', -16, -12, 'Studio'], ['strip', 18, 9, 'Strip'],
    ]) {
      await page.evaluate(([y, p, l]) => { window.__holo.lighting.setPreset(l); window.__holo.pose(y, p); }, [yaw, pitch, light]);
      await page.waitForTimeout(220);
      await page.screenshot({ path: join(out, `${key}-${label}.png`) });
    }
    console.log(key, 'captured');
  }
  const cache = await page.evaluate(async id => {
    const cpu = window.__holo.cpuPreparation, c = window.__holo.cards.find(c => c.id === id);
    await cpu.prepare(c, new AbortController().signal); const before = cpu.stats();
    await cpu.prepare(c, new AbortController().signal); return { before, after: cpu.stats() };
  }, targets[0].id);
  assert.equal(cache.after.hits, cache.before.hits + 1);
  assert.equal(cache.after.misses, cache.before.misses);
  assert.equal(cache.after.gpuCalls, 0);
  assert.deepEqual(errors, []);
  await writeFile(join(out, 'report.json'), JSON.stringify({ targets, poses: 3, cache, errors }, null, 2));
} finally { await browser.close(); }
