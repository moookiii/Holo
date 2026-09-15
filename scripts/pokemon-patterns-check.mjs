import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const out = join(process.cwd(), 'artifacts', process.env.POKEMON_OUT || '101-pokemon-final');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const report = [];
async function difference(page, a, b, bounds) {
  return page.evaluate(async ([aa, bb, bounds]) => {
    const decode = async data => {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, canvas.width, canvas.height);
    };
    const [a, b] = await Promise.all([decode(aa), decode(bb)]);
    let over1 = 0, max = 0;
    const [left, top, right, bottom] = bounds || [0, 0, a.width, a.height];
    for (let y = Math.ceil(top); y < Math.floor(bottom); y++) for (let x = Math.ceil(left); x < Math.floor(right); x++) {
      const i = (y * a.width + x) * 4;
      const delta = Math.max(...[0, 1, 2].map(c => Math.abs(a.data[i + c] - b.data[i + c])));
      if (delta > 1) over1++; max = Math.max(max, delta);
    }
    return { over1, max };
  }, [a.toString('base64'), b.toString('base64'), bounds]);
}
const atlasHash = page => page.evaluate(() => {
  const m = window.__holo.material();
  return [m.fieldTextureNode, m.reliefTextureNode].map(t => t.value.image.data.reduce((h, n) => Math.imul(h ^ n, 16777619), 2166136261));
});
try {
  for (const backend of ['webgpu', 'webgl']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
    await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
    await page.evaluate(async () => { await window.__holo.setCard('charizard-base-set'); window.__holo.hideUI(); window.__holo.pose(0, 0); });
    assert.equal((await page.evaluate(() => window.__holo.stats())).backend, backend === 'webgpu' ? 'WebGPUBackend' : 'WebGLBackend');
    const entries = [], fronts = [];
    for (const id of ['pokemon-fireworks', 'pokemon-crosshatch', 'pokemon-ace-spec']) {
      assert.equal(await page.locator(`#holo-select option[value="${id}"]:not([hidden]):not([disabled])`).count(), 1);
      await page.evaluate(id => window.__holo.setProfile(id), id);
      await page.evaluate(() => { window.__holo.pose(0, 0); window.__holo.lighting.setPreset('Studio'); });
      await page.waitForTimeout(200);
      const front = await page.screenshot(); fronts.push(front);
      await writeFile(join(out, `${backend}-${id}-front.png`), front);
      const fixedAtlas = await atlasHash(page);
      await page.waitForTimeout(200);
      const stationary = await difference(page, front, await page.screenshot());
      assert.equal(stationary.over1, 0, `${id} must not flicker while stationary`);
      const bounds = await page.evaluate(() => {
        const h = window.__holo, d = h.cards.find(c => c.id === 'charizard-base-set').dimensions;
        const project = (u, v) => { const p = h.camera.position.clone().set((u - .5) * d.width, (.5 - v) * d.height, d.thickness * .5).project(h.camera); return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2]; };
        return [...project(.16, .61), ...project(.85, .85)];
      });
      await page.evaluate(() => { window.__holo.material().optics.strength.value = 0; });
      await page.waitForTimeout(120); const noSpectrum = await page.screenshot();
      const spectral = await difference(page, front, noSpectrum), protectedText = await difference(page, front, noSpectrum, bounds);
      assert.ok(spectral.over1 > 2500, `${id} needs visible diffraction`);
      assert.equal(protectedText.over1, 0, `${id} must preserve rules ink`);
      await page.evaluate(id => window.__holo.setProfile(id), id);
      await page.evaluate(async () => {
        const h = window.__holo, start = performance.now();
        await new Promise(resolve => {
          const frame = now => { const t = Math.min(1, (now - start) / 1800); h.pose(Math.sin(t * Math.PI * 2) * 22, Math.sin(t * Math.PI * 4) * 14); if (t < 1) requestAnimationFrame(frame); else resolve(); };
          requestAnimationFrame(frame);
        }); h.pose(0, 0);
      });
      await page.waitForTimeout(160);
      const returned = await difference(page, front, await page.screenshot());
      assert.equal(returned.over1, 0, `${id} must return to exactly the same optical state`);
      assert.deepEqual(await atlasHash(page), fixedAtlas, 'foil remains attached during motion');
      for (const [name, yaw, pitch, roll] of [['left', -18, -6, 0], ['right', 22, 12, 0], ['diagonal', -28, 24, 20], ['edge', 88, 0, 0]]) {
        await page.evaluate(([y, p, r]) => window.__holo.pose(y, p, r), [yaw, pitch, roll]); await page.waitForTimeout(120);
        await page.screenshot({ path: join(out, `${backend}-${id}-${name}.png`) });
      }
      await page.evaluate(() => { window.__holo.pose(0, 0); window.__holo.lighting.setPreset('Strip'); });
      await page.waitForTimeout(160); const strip = await page.screenshot();
      const lightResponse = await difference(page, front, strip);
      assert.ok(lightResponse.over1 > 5000, `${id} must respond to a different studio light`);
      await writeFile(join(out, `${backend}-${id}-strip.png`), strip);
      const cachedSwitchMs = await page.evaluate(async id => { await window.__holo.setProfile('pokemon-cosmos-hd'); const start = performance.now(); await window.__holo.setProfile(id); return performance.now() - start; }, id);
      assert.deepEqual(await atlasHash(page), fixedAtlas, 'cached switches preserve the sheet');
      entries.push({ id, stationary, spectral, protectedText, returned, fixedAtlas, lightResponse, cachedSwitchMs });
      console.log(`${backend}: ${id} passed`);
    }
    const distinct = [];
    for (let a = 0; a < fronts.length; a++) for (let b = a + 1; b < fronts.length; b++) {
      const delta = await difference(page, fronts[a], fronts[b]); distinct.push(delta); assert.ok(delta.over1 > 15000, 'profiles must be visually distinct');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const entry of entries) {
      await page.evaluate(async id => { await window.__holo.setProfile(id); window.__holo.pose(-12, 8); window.__holo.lighting.setPreset('Studio'); }, entry.id);
      await page.waitForTimeout(160); await page.screenshot({ path: join(out, `${backend}-${entry.id}-mobile.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    assert.deepEqual(errors, []);
    report.push({ backend, entries, distinct, errors }); await page.close();
  }
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
} finally { await browser.close(); }
