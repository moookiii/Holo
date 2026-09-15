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
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const out = join(process.cwd(), 'artifacts', process.env.YGO_OUT || '41-ygo-ghost-check'); await mkdir(out, { recursive: true });
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
  for (const backend of process.env.YGO_BACKENDS?.split(',') ?? ['webgpu', 'webgl']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
    await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
    await page.evaluate(async () => { await window.__holo.setCard('effect-veiler-ra01'); window.__holo.hideUI(); window.__holo.pose(0, 0); });
    assert.equal((await page.evaluate(() => window.__holo.stats())).card, 'effect-veiler-ra01');
    await page.waitForTimeout(300);
    const still = await page.screenshot(); await page.waitForTimeout(250);
    const stationary = await difference(page, still, await page.screenshot());
    assert.ok(stationary.over1 === 0 && stationary.changed <= 50, 'authored varnish and foil remain stationary');
    await writeFile(join(out, `${backend}-veiler-front.png`), still);
    await page.evaluate(() => window.__holo.pose(-15, -15)); await page.waitForTimeout(160);
    const raised = await page.screenshot();
    await page.evaluate(() => { window.__holo.material().optics.varnishRelief.value = 0; });
    await page.waitForTimeout(160); const flat = await page.screenshot();
    const varnish = await difference(page, raised, flat);
    await writeFile(join(out, `${backend}-raised.png`), raised); await writeFile(join(out, `${backend}-flat-varnish.png`), flat);
    console.log('varnish lighting', backend, varnish);
    assert.ok(varnish.over1 > 1000 && varnish.max > 10, 'raised varnish must change reflected lighting, not only a profile flag');
    await page.evaluate(async () => { await window.__holo.setProfile('ygo-starlight'); window.__holo.pose(0, 0); });
    await page.waitForTimeout(200); const full = await page.screenshot();
    await page.evaluate(() => { window.__holo.material().surfaceControls.extendedCoverage.value = 0; });
    await page.waitForTimeout(160); const art = await page.screenshot();
    const extended = await difference(page, full, art);
    const textBounds = await page.evaluate(() => {
      const h = window.__holo, d = h.cards.find(c => c.id === 'effect-veiler-ra01').dimensions;
      const project = (u, v) => { const p = h.camera.position.clone().set((u - .5) * d.width, (.5 - v) * d.height, d.thickness * .5).project(h.camera); return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2]; };
      return [...project(.12, .77), ...project(.88, .9)];
    });
    const protectedText = await difference(page, full, art, textBounds);
    assert.ok(extended.over1 > 10000, 'extended mask adds visible foil outside artwork');
    assert.ok(protectedText.over1 === 0, 'extended foil must leave the rules text protected');
    await writeFile(join(out, `${backend}-starlight.png`), full);
    await page.evaluate(async () => { await window.__holo.setProfile('ygo-ultimate'); window.__holo.pose(-15, 0); });
    await page.waitForTimeout(160); const embossed = await page.screenshot();
    await writeFile(join(out, `${backend}-ultimate.png`), embossed);
    await page.evaluate(() => { window.__holo.material().surfaceControls.embossStrength.value = 0; });
    await page.waitForTimeout(160); const emboss = await difference(page, embossed, await page.screenshot());
    assert.ok(emboss.over1 > 1000 && emboss.max > 10, 'authored artwork relief must change Ultimate lighting');
    await page.evaluate(async () => { await window.__holo.setProfile('ygo-ghost'); window.__holo.pose(0, 0); });
    await page.waitForTimeout(200); const ghost = await page.screenshot();
    await page.waitForTimeout(200); const ghostStationary = await difference(page, ghost, await page.screenshot());
    assert.equal(ghostStationary.over1, 0, 'the reconstructed image stays stable at rest');
    assert.deepEqual(await page.evaluate(() => ({ opacity: window.__holo.material().opacity, transparent: window.__holo.material().transparent })), { opacity: 1, transparent: false });
    await page.evaluate(() => { window.__holo.material().optics.imageDepth.value = 0; });
    await page.waitForTimeout(160); const noDepth = await page.screenshot();
    const ghostDepth = await difference(page, ghost, noDepth);
    assert.ok(ghostDepth.over1 > 500, 'virtual image depth visibly changes the reconstructed image');
    assert.equal((await difference(page, ghost, noDepth, textBounds)).over1, 0, 'virtual depth cannot move the rules text');
    await page.evaluate(() => { const u = window.__holo.material().optics; u.imageDepth.value = .18; u.imageWidth.value = .04; });
    await page.waitForTimeout(160); const narrow = await page.screenshot();
    const ghostAngular = await difference(page, ghost, narrow);
    assert.ok(ghostAngular.over1 > 5000, 'angular selectivity must change reflected image visibility');
    assert.equal((await difference(page, ghost, narrow, textBounds)).over1, 0, 'image reconstruction cannot affect rules text');
    await writeFile(join(out, `${backend}-ghost.png`), ghost); await writeFile(join(out, `${backend}-ghost-no-depth.png`), noDepth); await writeFile(join(out, `${backend}-ghost-narrow.png`), narrow);
    await page.evaluate(() => window.__holo.flip()); await page.waitForTimeout(750);
    await page.screenshot({ path: join(out, `${backend}-back.png`) });
    assert.deepEqual(errors, []);
    report.push({ backend, passed: true, stationary, varnish, emboss, extended, protectedText, ghostStationary, ghostDepth, ghostAngular, errors });
    await page.close();
  }
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
