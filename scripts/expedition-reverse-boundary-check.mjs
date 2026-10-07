import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) for (const v of (await readdir(join(process.env.LOCALAPPDATA, 'ms-playwright'))).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
  const p = join(process.env.LOCALAPPDATA, 'ms-playwright', v, 'chrome-win64', 'chrome.exe');
  if (existsSync(p)) { executablePath = p; break; }
}
const backend = process.env.HOLO_BACKEND || 'webgl';
const out = `artifacts/expedition/reverse-boundaries/live/${backend}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 850, height: 1050 } });
const errors = [], report = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
  await page.waitForFunction(() => window.__holo?.ready && window.__holo.gallery.stats()?.active, null, { timeout: 120000 });
  await page.evaluate(() => { window.__holo.gallery.close(); window.__holo.hideUI(); });
  let cards = await page.evaluate(() => window.__holo.cards.filter(c => c.pokemon?.setId === 'ecard1' && c.pokemon.variant === 'reverse').map(c => ({ id: c.id, n: +c.pokemon.localId, title: c.title })));
  assert.equal(cards.length, 159);
  if (process.env.EXPEDITION_CARDS) cards = cards.filter(c => process.env.EXPEDITION_CARDS.split(',').includes(String(c.n)));
  for (const card of cards) {
    await page.evaluate(async id => { const h = window.__holo; await h.setCard(id, true); h.pose(0, 0); h.lighting.setPreset('Studio'); }, card.id);
    assert.equal(await page.evaluate(() => window.__holo.stats().profile), 'pokemon-e-reader');
    const coverage = await page.evaluate(async () => {
      const h = window.__holo, def = h.cards.find(c => c.id === h.stats().card);
      const field = h.material().coverageTextureNode.value, { width, height, data } = field.image;
      const decode = async path => { const im = await createImageBitmap(await (await fetch(path)).blob()); const cv = new OffscreenCanvas(width, height); const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(im, 0, 0, width, height); im.close(); return ctx.getImageData(0, 0, width, height).data; };
      const expected = await decode(def.maps.reverseFoil), protection = def.maps.protection ? await decode(def.maps.protection) : undefined;
      let mismatch = 0, maxError = 0, rails = 0;
      for (let y = Math.ceil(430 / 825 * height); y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const value = Math.round(expected[i] * (1 - (protection?.[i] ?? 0) / 255));
        const error = Math.abs(data[i] - value); maxError = Math.max(maxError, error); if (error > 8) mismatch++;
        if (y >= Math.ceil(791 / 825 * height) && data[i] > 2) rails++;
      }
      return { mask: def.maps.reverseFoil, dimensions: [width, height], mismatch, maxError, rails };
    });
    assert.equal(coverage.mismatch, 0, `${card.id}: loaded lower coverage differs from PNG ${JSON.stringify(coverage)}`);
    assert.equal(coverage.rails, 0, `${card.id}: bottom e-Reader rail must be opaque`);
    for (const [name, light, yaw, pitch] of [['front', 'Studio', 0, 0], ['grazing', 'Strip', -24, 16], ['specular', 'Soft', 24, -12]]) {
      await page.evaluate(([light, yaw, pitch]) => { window.__holo.lighting.setPreset(light); window.__holo.pose(yaw, pitch); }, [light, yaw, pitch]);
      await page.waitForTimeout(100);
      await page.screenshot({ path: `${out}/${card.n}-${name}.png` });
    }
    report.push({ ...card, coverage });
    await writeFile(`${out}/report.json`, JSON.stringify({ backend, report, errors }, null, 2));
    console.log(`${card.n} ${card.title}: ${JSON.stringify(coverage)}`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
