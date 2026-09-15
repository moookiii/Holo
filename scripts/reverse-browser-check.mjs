import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const n of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = join(base, n, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const out = join(process.cwd(), 'artifacts', process.env.REVERSE_OUT || '126-reverse-check');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const report = [];
const cards = [
  { id: 'eevee-legendary-reverse', profile: 'pokemon-legendary-reverse', art: [70, 110, 525, 415], body: [28, 480, 570, 795], protected: [[60, 90, 540, 430]], border: [7, 110, 17, 690] },
  { id: 'charizard-expedition-reverse', profile: 'pokemon-e-reader', art: [145, 110, 574, 390], body: [75, 422, 575, 750], protected: [[20, 100, 45, 710], [588, 50, 595, 765], [160, 793, 570, 815], [150, 105, 576, 396]], border: [7, 110, 17, 690] },
];
async function diff(page, a, b, rect) {
  return page.evaluate(async ([a, b, rect]) => {
    const decode = async src => {
      const im = new Image(); im.src = `data:image/png;base64,${src}`; await im.decode();
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0); return ctx.getImageData(0, 0, c.width, c.height);
    };
    const [aa, bb] = await Promise.all([decode(a), decode(b)]);
    const r = rect || [0, 0, aa.width, aa.height]; let over1 = 0, max = 0;
    for (let y = Math.ceil(r[1]); y < Math.floor(r[3]); y++) for (let x = Math.ceil(r[0]); x < Math.floor(r[2]); x++) {
      const i = (y * aa.width + x) * 4;
      const d = Math.max(...[0, 1, 2].map(c => Math.abs(aa.data[i + c] - bb.data[i + c])));
      if (d > 1) over1++; max = Math.max(max, d);
    }
    return { over1, max };
  }, [a.toString('base64'), b.toString('base64'), rect]);
}
async function screenRect(page, r) {
  return page.evaluate(r => {
    const h = window.__holo, d = h.cards.find(c => c.id === h.stats().card).dimensions;
    const project = (x, y) => {
      const p = h.camera.position.clone().set((x / 600 - .5) * d.width, (.5 - y / 825) * d.height, d.thickness / 2).project(h.camera);
      return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2];
    }; return [...project(r[0], r[1]), ...project(r[2], r[3])];
  }, r);
}
const hashes = page => page.evaluate(() => {
  const m = window.__holo.material();
  return [m.fieldTextureNode, m.reliefTextureNode, m.coverageTextureNode].map(t => t.value.image.data.reduce((h, b) => Math.imul(h ^ b, 16777619), 2166136261));
});
try {
  for (const backend of ['webgpu', 'webgl']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [], warnings = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
    page.on('requestfailed', r => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
    await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
    assert.equal((await page.evaluate(() => window.__holo.stats())).backend, backend === 'webgpu' ? 'WebGPUBackend' : 'WebGLBackend');
    const entries = [];
    for (const card of cards) {
      await page.evaluate(async id => { await window.__holo.setCard(id); window.__holo.hideUI(); window.__holo.pose(0, 0); }, card.id);
      assert.equal((await page.evaluate(() => window.__holo.stats())).profile, card.profile);
      assert.equal(await page.locator(`#holo-select option[value="${card.profile}"]:not([hidden]):not([disabled])`).count(), 1);
      const coverage = await page.evaluate(card => {
        const m = window.__holo.material().coverageTextureNode.value.image;
        const range = r => {
          let min = 255, max = 0, sum = 0, count = 0;
          for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) {
            const i = (Math.floor(y / 825 * m.height) * m.width + Math.floor(x / 600 * m.width)) * 4;
            const n = m.data[i]; min = Math.min(min, n); max = Math.max(max, n); sum += n; count++;
          } return { min, max, mean: sum / count };
        };
        // Probe the former paper cutouts, outside the antialiased printed edges.
        const gapPoints = [[75, 548], [55, 650], [95, 651], [552, 465], [538, 467], [80, 467]];
        return { protected: card.protected.map(range), body: range(card.body), border: range(card.border),
          paperGaps: card.id.startsWith('eevee') ? gapPoints.map(([x, y]) => range([x, y, x + 1, y + 1])) : [] };
      }, card);
      for (const r of coverage.protected) assert.equal(r.max, 0, `${card.id}: coverage leaks into a protected window/rail`);
      assert.ok(coverage.body.mean > 60, `${card.id}: reverse body foil is missing`);
      assert.equal(coverage.border.max, card.id.startsWith('eevee') ? 255 : 0, 'historical border coverage differs between these printings');
      for (const gap of coverage.paperGaps) assert.ok(gap.min > 180, 'Eevee: an oversized icon/description cutout protects surrounding paper');
      await page.waitForTimeout(200); const front = await page.screenshot();
      await writeFile(join(out, `${backend}-${card.id}-front.png`), front);
      const fixed = await hashes(page);
      await page.waitForTimeout(200); const stationary = await diff(page, front, await page.screenshot());
      assert.equal(stationary.over1, 0, 'stationary foil must remain temporally stable');
      const artRect = await screenRect(page, card.art), bodyRect = await screenRect(page, card.body);
      await page.evaluate(() => { window.__holo.material().optics.strength.value = 0; });
      await page.waitForTimeout(150); const noSpectrum = await page.screenshot();
      const spectralBody = await diff(page, front, noSpectrum, bodyRect), artwork = await diff(page, front, noSpectrum, artRect);
      assert.ok(spectralBody.over1 > 2000, `${card.id}: need visible body diffraction`);
      assert.equal(artwork.over1, 0, `${card.id}: diffraction must leave the illustration unchanged`);
      await page.evaluate(id => window.__holo.setProfile(id), card.profile);
      await page.evaluate(async () => {
        const h = window.__holo, start = performance.now();
        await new Promise(resolve => { const frame = now => {
          const t = Math.min(1, (now - start) / 1800); h.pose(Math.sin(t * Math.PI * 2) * 30, Math.sin(t * Math.PI * 4) * 18, Math.sin(t * Math.PI * 2) * 11);
          if (t < 1) requestAnimationFrame(frame); else resolve();
        }; requestAnimationFrame(frame); }); h.pose(0, 0);
      });
      await page.waitForTimeout(150); const returned = await diff(page, front, await page.screenshot());
      assert.equal(returned.over1, 0, 'returning to the pose restores the same optical state');
      assert.deepEqual(await hashes(page), fixed, 'foil manufacturing and coverage remain fixed during motion');
      for (const [name, yaw, pitch, roll] of [['left', -18, -6, 0], ['right', 22, 12, 0], ['diagonal', -28, 24, 20], ['edge', 88, 0, 0]]) {
        await page.evaluate(([y, p, r]) => window.__holo.pose(y, p, r), [yaw, pitch, roll]); await page.waitForTimeout(150);
        await page.screenshot({ path: join(out, `${backend}-${card.id}-${name}.png`) });
      }
      await page.evaluate(() => { window.__holo.pose(0, 0); window.__holo.lighting.setPreset('Strip'); });
      await page.waitForTimeout(150); const lightResponse = await diff(page, front, await page.screenshot(), bodyRect);
      assert.ok(lightResponse.over1 > 5000, 'body foil must respond to light direction');
      await page.evaluate(() => window.__holo.lighting.setPreset('Studio'));
      const cachedSwitchMs = await page.evaluate(async id => { await window.__holo.setProfile('pokemon-cosmos'); const start = performance.now(); await window.__holo.setProfile(id); return performance.now() - start; }, card.profile);
      assert.deepEqual(await hashes(page), fixed);
      entries.push({ card: card.id, coverage, stationary, spectralBody, artwork, returned, fixed, lightResponse, cachedSwitchMs });
      console.log(`${backend}: ${card.id} passed`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const card of cards) {
      await page.evaluate(async id => { await window.__holo.setCard(id); window.__holo.pose(-12, 8); }, card.id);
      await page.waitForTimeout(180); await page.screenshot({ path: join(out, `${backend}-${card.id}-mobile.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    assert.deepEqual(errors, []); assert.deepEqual(warnings, []);
    report.push({ backend, entries, errors, warnings });
    await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
    await page.close();
  }
} catch (error) {
  await writeFile(join(out, 'failure.json'), JSON.stringify({ error: String(error), report }, null, 2));
  throw error;
} finally { await browser.close(); }
