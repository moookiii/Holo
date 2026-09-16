import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const path = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(path)) { executablePath = path; break; }
  }
}
const out = 'artifacts/ygo-stock-check';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const report = [];

async function difference(page, a, b, nameOnly = false) {
  return page.evaluate(async ([a, b, nameOnly]) => {
    const decode = async bytes => {
      const image = new Image(); image.src = `data:image/png;base64,${bytes}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height);
    };
    const [aa, bb] = await Promise.all([decode(a), decode(b)]);
    const h = window.__holo, d = h.cards.find(c => c.id === h.stats().card).dimensions;
    const project = (u, v) => {
      const p = h.camera.position.clone().set((u - .5) * d.width, (.5 - v) * d.height, d.thickness * .5).project(h.camera);
      return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2];
    };
    const [left, top] = project(0, 0), [right, bottom] = project(1, 1);
    const map = h.material().coverageTextureNode.value.image;
    let changed = 0, max = 0, samples = 0;
    for (let y = 0; y < aa.height; y++) for (let x = 0; x < aa.width; x++) {
      if (nameOnly) {
        const u = (x + .5 - left) / (right - left), v = (y + .5 - top) / (bottom - top);
        if (u < .05 || u > .94 || v < .04 || v > .125) continue;
        const tx = Math.floor(u * map.width), ty = Math.floor(v * map.height);
        // Inset the glyph mask by a screen pixel to omit rasterized boundaries.
        const margin = Math.ceil(map.width / (right - left)) + 1;
        let covered = true;
        for (let dy = -margin; dy <= margin; dy++) for (let dx = -margin; dx <= margin; dx++) {
          const i = ((ty + dy) * map.width + tx + dx) * 4;
          if (Math.max(map.data[i + 1], map.data[i + 2]) < 100) covered = false;
        }
        if (!covered) continue;
      }
      const i = (y * aa.width + x) * 4;
      const delta = Math.max(...[0, 1, 2].map(c => Math.abs(aa.data[i + c] - bb.data[i + c])));
      if (delta > 1) changed++;
      max = Math.max(max, delta); samples++;
    }
    return { changed, max, samples };
  }, [a.toString('base64'), b.toString('base64'), nameOnly]);
}

try {
  for (const backend of process.env.YGO_STOCK_BACKENDS?.split(',') ?? ['webgpu', 'webgl']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${process.env.HOLO_URL || 'http://127.0.0.1:5173'}/?backend=${backend}`);
    await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
    await page.evaluate(async () => { await window.__holo.setCard('blue-eyes'); window.__holo.hideUI(); window.__holo.pose(0, 0); });
    await page.waitForTimeout(1000);
    assert.deepEqual(errors, [], 'rendering must initialize without shader errors');
    const shot = async () => { await page.waitForTimeout(220); return page.screenshot(); };
    const front = await shot(), still = await shot(), stationary = await difference(page, front, still);
    await writeFile(`${out}/${backend}-stationary-a.png`, front);
    await writeFile(`${out}/${backend}-stationary-b.png`, still);
    assert.equal(stationary.changed, 0, 'the stock cannot flicker at rest');
    await page.evaluate(() => { window.__holo.material().stock.strength.value = 0; });
    const smooth = await shot(), name = await difference(page, front, smooth, true);
    assert.ok(name.samples > 100, 'sample actual interiors of the name glyphs');
    assert.equal(name.changed, 0, 'stock texture must never affect the card name');
    await page.evaluate(() => { window.__holo.material().stock.strength.value = 1; window.__holo.pose(-15, -15); });
    const reflected = await shot();
    await page.evaluate(() => { window.__holo.material().stock.strength.value = 0; });
    const highlight = await difference(page, reflected, await shot());
    assert.ok(highlight.changed > 1000, 'the new surface must visibly break up reflected highlights');
    await writeFile(`${out}/${backend}-reflection.png`, reflected);
    await page.evaluate(() => {
      const m = window.__holo.material(); m.userData.savedCoat = m.clearcoatNode;
      m.clearcoatNode = m.stock.strength.mul(0); m.needsUpdate = true;
    });
    const noCoating = await shot();
    await page.evaluate(() => { window.__holo.material().stock.strength.value = 1; });
    const diffuse = await difference(page, noCoating, await shot());
    assert.equal(diffuse.changed, 0, 'grain belongs only to the reflected coating; print and foil shading stay unchanged');
    await page.evaluate(() => { const m = window.__holo.material(); m.clearcoatNode = m.userData.savedCoat; delete m.userData.savedCoat; m.needsUpdate = true; window.__holo.pose(0, 0); });
    const returned = await difference(page, front, await shot());
    assert.equal(returned.changed, 0, 'the surface stays attached to the card after rotating away and back');
    await writeFile(`${out}/${backend}-front.png`, front);
    await page.evaluate(() => { window.__holo.zoom(.64); window.__holo.pose(-12, -17); });
    const close = await shot();
    await writeFile(`${out}/${backend}-close.png`, close);
    await page.evaluate(() => { window.__holo.material().stock.parallax.value = 0; });
    const parallax = await difference(page, close, await shot());
    console.log(backend, 'parallax', parallax);
    assert.ok(parallax.changed > 50, 'height-based parallax must visibly change the coating at an oblique close view');
    await page.evaluate(() => { window.__holo.material().stock.parallax.value = 1; });
    assert.equal((await difference(page, close, await shot())).changed, 0, 'parallax returns to the same manufactured surface');
    await page.evaluate(() => { window.__holo.zoom(1); window.__holo.pose(180, 0); });
    await writeFile(`${out}/${backend}-back.png`, await shot());
    for (const card of ['effect-veiler-ra01', 'ip-masquerena']) {
      await page.evaluate(async card => { await window.__holo.setCard(card); window.__holo.pose(-15, -15); }, card);
      await writeFile(`${out}/${backend}-${card}.png`, await shot());
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.__holo.pose(12, -8));
    await writeFile(`${out}/${backend}-mobile.png`, await shot());
    assert.deepEqual(errors, []);
    const result = { backend, stationary, name, highlight, diffuse, returned, parallax, errors };
    report.push(result); console.log(JSON.stringify(result));
    await page.close();
  }
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
} finally { await browser.close(); }
