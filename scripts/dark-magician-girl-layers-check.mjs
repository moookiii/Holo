import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const out = 'artifacts/dmg-layers';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const reports = [];
try {
  for (const backend of ['webgpu', 'webgl']) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
    await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
    await page.evaluate(async () => {
      const h = window.__holo; await h.setCard('dark-magician-girl'); h.hideUI(); h.setMode('rotate'); h.pose(0, 0);
    });
    const stats = await page.evaluate(() => window.__holo.stats());
    assert.equal(stats.backend, backend === 'webgpu' ? 'WebGPUBackend' : 'WebGLBackend');

    const maps = await page.evaluate(() => {
      const m = window.__holo.material();
      const sample = (node, x, y) => {
        const { width, height, data } = node.value.image;
        const index = (Math.floor(y/800*height)*width + Math.floor(x/549*width))*4;
        return Array.from(data.slice(index, index+4));
      };
      return {
        background: sample(m.coverageTextureNode, 100, 210),
        figure: sample(m.coverageTextureNode, 270, 300),
        rules: sample(m.coverageTextureNode, 150, 650),
        backgroundSurface: sample(m.surfaceTextureNode, 100, 210),
        figureSurface: sample(m.surfaceTextureNode, 270, 300),
        stamp: sample(m.surfaceTextureNode, 515, 765),
        frame: sample(m.patternTextureNode, 40, 400),
        rulesPattern: sample(m.patternTextureNode, 150, 650),
        imageFigure: sample(m.hologramTextureNode, 270, 300),
        imageRules: sample(m.hologramTextureNode, 150, 650),
        secondaryPixels: Array.from(m.coverageTextureNode.value.image.data).filter((v, i) => i%4 === 1 && v > 128).length,
      };
    });
    assert.ok(maps.background[0] > 240 && maps.figure[0] < 5, 'keep artwork coverage and character exclusions');
    assert.deepEqual(maps.rules.slice(0, 3), [0, 0, 0], 'protect rules from all foil/metal layers');
    assert.ok(maps.figureSurface[0] > maps.backgroundSurface[0]+25, 'sculpted figure height');
    assert.ok(maps.figureSurface[1] > maps.backgroundSurface[1]+10, 'independent surface roughness');
    assert.ok(maps.backgroundSurface[2] > 150 && maps.figureSurface[2] < 5, 'sparkle stays in foil');
    assert.ok(maps.stamp[3] > 240 && maps.stamp[2] > 240, 'stamp coverage and sparkle both populated');
    assert.ok(maps.frame[3] > 150 && maps.rulesPattern[3] === 0, 'parallel frame with protected rules');
    assert.ok(maps.imageFigure[1] > 240 && maps.imageRules[1] === 0, 'Ghost includes the character, excludes rules');
    assert.ok(maps.secondaryPixels > 1000, 'rainbow title layer is populated');

    const shot = async name => {
      await page.waitForTimeout(400);
      return page.screenshot({ path: name ? `${out}/${backend}-${name}.png` : undefined });
    };
    // Wait for GPU compilation and the framing loop to settle before comparing.
    await page.waitForTimeout(1200);
    const front = await shot('default');
    assert.ok(front.equals(await shot()), 'stationary material must remain deterministic');
    await page.evaluate(() => window.__holo.pose(-18, -12));
    const tilt = await shot('default-tilted');
    assert.ok(!front.equals(tilt), 'foil responds to tilt');
    await page.evaluate(() => window.__holo.pose(0, 0));
    assert.ok(front.equals(await shot()), 'returning to a pose restores the exact material');

    for (const [name, profile] of [['secret', 'ygo-secret'], ['ultimate', 'ygo-ultimate'], ['starlight', 'ygo-starlight'], ['ghost', 'ygo-ghost']]) {
      await page.evaluate(async p => { await window.__holo.setProfile(p); window.__holo.pose(0, 0); }, profile);
      const enabled = await shot(name);
      if (name === 'secret') {
        await page.evaluate(() => { window.__holo.material().secondaryOptics.enabled.value = 0; });
      } else if (name === 'ultimate') {
        await page.evaluate(() => { window.__holo.material().surfaceControls.embossStrength.value = 0; });
      } else if (name === 'starlight') {
        await page.evaluate(() => { window.__holo.material().surfaceControls.extendedCoverage.value = 0; });
      } else {
        await page.evaluate(() => { window.__holo.material().optics.imageHologram.value = 0; });
      }
      assert.ok(!enabled.equals(await shot(`${name}-disabled`)), `${name} layer must visibly affect the card`);
    }
    await page.evaluate(async () => {
      const h = window.__holo; await h.setCard('nocturne'); await h.setCard('dark-magician-girl'); h.pose(0, 0);
    });
    const restored = await shot('restored');
    assert.ok(front.equals(restored), 'switching cards restores all authored material layers');
    await page.evaluate(() => { window.__holo.zoom(.72); window.__holo.pose(-22, -14); });
    await shot('close');
    await page.evaluate(() => { window.__holo.zoom(1); window.__holo.pose(180, 0); });
    await shot('back');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.__holo.pose(12, -8));
    await shot('mobile');
    assert.deepEqual(errors, [], 'all authored maps must load and both renderers must compile');
    reports.push({ backend: stats.backend, maps, stationary: true, restored: true, layerIsolation: true, errors });
    console.log(JSON.stringify(reports.at(-1)));
    await page.close();
  }
  await writeFile(`${out}/report.json`, JSON.stringify(reports, null, 2));
} finally { await browser.close(); }
