import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
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
const backend = process.env.HOLO_BACKEND || 'webgl';
const out = `artifacts/expedition/live/${backend}`;
const reportName = process.env.EXPEDITION_CARD ? `report-${process.env.EXPEDITION_CARD}.json` : 'report.json';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 850, height: 1050 } });
const errors = [], report = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400 && r.url().includes('/cards/pokemon/expedition/')) errors.push(`${r.status()} ${r.url()}`); });
try {
  await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
  await page.waitForFunction(() => window.__holo?.ready && window.__holo.gallery.stats()?.active, null, { timeout: 90000 });
  await page.evaluate(() => window.__holo.gallery.close());
  await page.evaluate(() => window.__holo.hideUI());
  let cards = await page.evaluate(() => window.__holo.cards.filter(c => c.pokemon?.setId === 'ecard1' && c.pokemon.variant === 'holo').map(c => ({ id: c.id, title: c.title })));
  assert.equal(cards.length, 32);
  if (process.env.EXPEDITION_CARD) cards = cards.filter(c => c.id === `pokemon:ecard1-${process.env.EXPEDITION_CARD}:holo`);
  const references = await page.evaluate(() => window.__holo.cards.filter(c => ['pokemon:base4-1:holo', 'pokemon:basep-34:holo'].includes(c.id)).map(c => ({ id: c.id, title: c.title })));
  assert.equal(references.length, 2);
  for (const card of [...cards, ...references]) {
    await page.evaluate(async id => { await window.__holo.setCard(id, true); window.__holo.pose(0, 0); window.__holo.lighting.setPreset('Studio'); }, card.id);
    assert.equal(await page.evaluate(() => window.__holo.stats().profile), 'pokemon-base-set-2-cosmos');
    const registration = await page.evaluate(async id => {
      const h = window.__holo, card = h.cards.find(c => c.id === id), field = h.material().fieldTextureNode.value;
      const { width, height, data } = field.image;
      const im = new Image(); im.src = card.maps.motif; await im.decode();
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      const ctx = cv.getContext('2d'); ctx.drawImage(im, 0, 0); const png = ctx.getImageData(0, 0, im.width, im.height).data;
      let missing = 0, extra = 0, expected = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const px = Math.min(im.width - 1, Math.floor((x + .5) / width * im.width));
        const py = Math.min(im.height - 1, Math.floor((1 - (y + .5) / height) * im.height));
        const mask = png[(py * im.width + px) * 4] / 255, actual = data[(y * width + x) * 4 + 3];
        if (mask > .5) { expected++; if (actual < 80) missing++; }
        if (mask === 0 && actual > 8) extra++;
      }
      return { expected, missing, extra, flipY: field.flipY };
    }, card.id);
    assert.equal(registration.missing, 0); assert.equal(registration.extra, 0); assert.equal(registration.flipY, false); assert.ok(registration.expected > 100);
    const states = [['Studio', 'front', 0, 0], ['Studio', 'left', -14, 8], ['Studio', 'right', 14, -8],
      ['Strip', 'grazing', -28, 18], ['Low key', 'dark', 12, -10], ['Soft', 'specular', 26, 16]];
    for (const [light, name, yaw, pitch] of states) {
      await page.evaluate(([l, y, p]) => { window.__holo.lighting.setPreset(l); window.__holo.pose(y, p); }, [light, yaw, pitch]);
      await page.waitForTimeout(180);
      await page.screenshot({ path: `${out}/${card.id.replaceAll(':', '-')}-${name}.png` });
    }
    await page.evaluate(() => { window.__holo.lighting.setPreset('Moving light'); window.__holo.lighting.playing = true; window.__holo.pose(0, 0); });
    await page.waitForTimeout(200); const before = await page.screenshot();
    await page.waitForTimeout(500); const after = await page.screenshot();
    assert.notDeepEqual(before, after, `${card.title}: moving light`);
    await page.screenshot({ path: `${out}/${card.id.replaceAll(':', '-')}-moving.png` });
    await page.evaluate(() => window.__holo.lighting.setPreset('Studio'));
    report.push({ ...card, registration, captures: states.map(s => s[1]) });
    await writeFile(`${out}/${reportName}`, JSON.stringify({ report, errors }, null, 2));
    console.log(card.title, JSON.stringify(registration));
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
