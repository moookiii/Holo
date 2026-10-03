import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const out = join(process.cwd(), 'artifacts/signal-forest/live');
await mkdir(out, { recursive: true });
let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const folder of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = join(base, folder, 'chrome-win64/chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const report = [];
try {
  for (const backend of (process.env.SIGNAL_BACKENDS || 'webgpu,webgl').split(',')) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 1.5 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
    await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
    await page.waitForFunction(() => window.__holo.gallery.instance()?.openingReady, null, { timeout: 120000 });
    await page.evaluate(() => window.__holo.gallery.close('nocturne'));
    await page.evaluate(() => window.__holo.setMode('rotate'));
    for (const id of ['signal-arbor', 'recursive-gate']) {
      // Verify actual catalog discoverability and selection.
      await page.evaluate(() => { document.querySelector('#ui').style.display = ''; });
      await page.locator('#card-toggle').click();
      await page.locator('#card-search').fill(id === 'signal-arbor' ? 'Signal Arbor' : 'Recursive Gate');
      assert.equal(await page.locator('.card-option').count(), 1);
      await page.locator('.card-option').click();
      await page.waitForFunction(id => window.__holo.stats().card === id, id, { timeout: 120000 });
      const material = await page.evaluate(id => {
        const mesh = window.__holo.scene.getObjectByName(`card:${id}`);
        const c = mesh.userData.cardInstance.definition;
        return {
          front: c.front, back: c.back, maps: c.maps, backMaps: c.backMaps,
          dimensions: c.dimensions,
          faces: mesh.material.slice(0, 2).map(m => ({
            type: m.constructor.name, normal: m.surfaceControls.hasNormal.value,
            emboss: m.surfaceControls.embossStrength.value, normalScale: m.surfaceControls.normalScale.value,
            strength: m.optics.strength.value, glints: m.optics.glintStrength.value,
            roughness: m.surfaceControls.roughnessAbsolute.value,
            mapSize: [m.surfaceTextureNode.value.image.width, m.surfaceTextureNode.value.image.height],
          })),
        };
      }, id);
      assert.equal(material.front, material.back);
      assert.deepEqual(material.maps, material.backMaps);
      assert.deepEqual(material.faces[0], material.faces[1]);
      assert.equal(material.faces[0].normal, 1);
      assert.equal(material.faces[0].emboss, 0);
      assert.equal(material.faces[0].glints, 0);
      assert.equal(material.faces[0].roughness, 1);
      assert.deepEqual(material.faces[0].mapSize, [1536, 3072]);
      await page.evaluate(() => window.__holo.hideUI());
      for (const light of ['Studio', 'Strip', 'Low key']) {
        await page.evaluate(light => window.__holo.lighting.setPreset(light), light);
        for (const [pose, yaw, pitch, zoom] of [
          ['front', 0, 0, 1], ['oblique', -24, 14, 1], ['sweep', 25, -12, 1],
          ['back', 180, 0, 1], ['detail', -12, -9, .52],
        ]) {
          await page.evaluate(([yaw, pitch, zoom]) => { window.__holo.pose(yaw, pitch); window.__holo.zoom(zoom); }, [yaw, pitch, zoom]);
          await page.waitForTimeout(220);
          await page.screenshot({ path: join(out, `${backend}-${id}-${light.replaceAll(' ', '-')}-${pose}.png`) });
        }
      }
      // Reselecting the native material must keep the same authored normal response.
      await page.evaluate(() => window.__holo.setProfile('signal-forest-etched'));
      assert.equal(await page.evaluate(() => window.__holo.material().surfaceControls.embossStrength.value), 0);
      // Warm the CPU cache, then enter through the real gallery focus path.
      // hasNormal alone is insufficient: the GPU texture must not be a flat fallback.
      const cachedNormalSizes = await page.evaluate(async id => {
        const h = window.__holo;
        await h.cpuPreparation.prepare(h.cards.find(c => c.id === id), new AbortController().signal);
        await h.gallery.close(id);
        const mesh = h.scene.getObjectByName(`card:${id}`);
        return mesh.material.slice(0, 2).map(m => [m.normalTextureNode.value.image.width, m.normalTextureNode.value.image.height]);
      }, id);
      assert.deepEqual(cachedNormalSizes, [[1536, 3072], [1536, 3072]]);
      await page.evaluate(() => { window.__holo.lighting.setPreset('Strip'); window.__holo.pose(192, -9); window.__holo.zoom(.52); });
      await page.waitForTimeout(220);
      await page.screenshot({ path: join(out, `${backend}-${id}-cached-back-detail.png`) });
      report.push({ backend, id, material, cachedNormalSizes, errors: [...errors] });
      console.log(`${backend}: ${id} front/back fields, catalog, three lights and five views passed`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
