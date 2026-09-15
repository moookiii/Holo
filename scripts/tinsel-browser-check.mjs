import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const v of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = join(base, v, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const out = join(process.cwd(), 'artifacts', process.env.TINSEL_OUT || '60-tinsel-check');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const report = [];
async function difference(page, a, b, bounds) {
  return page.evaluate(async ([aa, bb, bounds]) => {
    const decode = async data => {
      const im = new Image(); im.src = `data:image/png;base64,${data}`; await im.decode();
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0); return ctx.getImageData(0, 0, c.width, c.height);
    };
    const [a, b] = await Promise.all([decode(aa), decode(bb)]);
    let changed = 0, over1 = 0, max = 0;
    const [left, top, right, bottom] = bounds || [0, 0, a.width, a.height];
    for (let y = Math.ceil(top); y < Math.floor(bottom); y++) for (let x = Math.ceil(left); x < Math.floor(right); x++) {
      const i = (y * a.width + x) * 4;
      const delta = Math.max(...[0, 1, 2].map(c => Math.abs(a.data[i + c] - b.data[i + c])));
      if (delta) changed++; if (delta > 1) over1++; max = Math.max(max, delta);
    }
    return { changed, over1, max };
  }, [a.toString('base64'), b.toString('base64'), bounds]);
}
try {
  for (const backend of ['webgpu', 'webgl']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
    await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
    await page.evaluate(async () => {
      const h = window.__holo; await h.setCard('charizard-base-set'); await h.setProfile('pokemon-tinsel'); h.hideUI(); h.pose(0, 0);
    });
    assert.equal((await page.evaluate(() => window.__holo.stats())).backend, backend === 'webgpu' ? 'WebGPUBackend' : 'WebGLBackend');
    await page.waitForTimeout(250);
    const neutralStrength = await page.evaluate(() => window.__holo.material().optics.sheen.value);
    const front = await page.screenshot(); await page.waitForTimeout(250);
    const stationary = await difference(page, front, await page.screenshot());
    assert.ok(stationary.over1 === 0 && stationary.changed <= 50, 'Tinsel must remain stationary');
    const bounds = await page.evaluate(() => {
      const h = window.__holo, d = h.cards.find(c => c.id === 'charizard-base-set').dimensions;
      const project = (u, v) => { const p = h.camera.position.clone().set((u - .5) * d.width, (.5 - v) * d.height, d.thickness * .5).project(h.camera); return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2]; };
      return [...project(.16, .60), ...project(.85, .85)];
    });
    await page.evaluate(() => { window.__holo.material().optics.facetCoupling.value = 0; });
    await page.waitForTimeout(160); const flat = await page.screenshot();
    const coupled = await difference(page, front, flat);
    const protectedText = await difference(page, front, flat, bounds);
    assert.ok(coupled.over1 > 5000 && coupled.max > 15, 'manufactured band inclinations must change the actual optical response');
    assert.equal(protectedText.over1, 0, 'band response must not affect printed rules');
    await writeFile(join(out, `${backend}-front.png`), front);
    await writeFile(join(out, `${backend}-flat-axis.png`), flat);
    await page.evaluate(() => { window.__holo.material().optics.facetCoupling.value = 1; window.__holo.material().optics.sheen.value = 0; });
    await page.waitForTimeout(160); const withoutSilver = await page.screenshot();
    const silver = await difference(page, front, withoutSilver);
    assert.ok(silver.over1 > 5000, 'neutral band reflection coexists with spectral color');
    assert.equal((await difference(page, front, withoutSilver, bounds)).over1, 0);
    await page.evaluate(value => { window.__holo.material().optics.sheen.value = value; }, neutralStrength);
    const atlasBefore = await page.evaluate(() => Array.from(window.__holo.material().reliefTextureNode.value.image.data).reduce((h, n) => Math.imul(h ^ n, 16777619), 2166136261));
    // A smooth sweep changes only quaternion orientation, never the foil atlas.
    await page.evaluate(async () => {
      const h = window.__holo, start = performance.now();
      await new Promise(resolve => {
        const frame = now => { const t = Math.min(1, (now - start) / 3000); h.pose(Math.sin(t * Math.PI * 2) * 16, Math.sin(t * Math.PI * 4) * 12); if (t < 1) requestAnimationFrame(frame); else resolve(); };
        requestAnimationFrame(frame);
      });
      h.pose(0, 0);
    });
    await page.waitForTimeout(200);
    const returned = await difference(page, front, await page.screenshot());
    assert.ok(returned.over1 === 0 && returned.changed <= 50, 'returning from motion restores the same foil image');
    const atlasAfter = await page.evaluate(() => Array.from(window.__holo.material().reliefTextureNode.value.image.data).reduce((h, n) => Math.imul(h ^ n, 16777619), 2166136261));
    assert.equal(atlasBefore, atlasAfter, 'the structure remains fixed to the card throughout motion');
    for (const pitch of [-12, -8, -4, 0, 4, 8, 12]) {
      await page.evaluate(p => window.__holo.pose(0, p), pitch); await page.waitForTimeout(120);
      await page.screenshot({ path: join(out, `${backend}-pitch-${pitch}.png`) });
    }
    await page.evaluate(async () => { await window.__holo.setProfile('pokemon-cosmos'); });
    assert.equal(await page.evaluate(() => window.__holo.material().optics.facetCoupling.value), 0, 'existing profiles retain their calibrated response');
    assert.deepEqual(errors, []);
    report.push({ backend, stationary, coupled, silver, protectedText, returned, fixedAtlas: atlasBefore === atlasAfter, errors });
    await page.close();
  }
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
