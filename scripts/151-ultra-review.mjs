import { chromium } from 'playwright';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const out = join(process.cwd(), 'artifacts', process.env.CAPTURE_NAME || '151-ultra/after');
await mkdir(out, { recursive: true });
const options = { headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] };
if (!existsSync(chromium.executablePath())) {
  const base = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const path = join(base, version, 'chrome-win64/chrome.exe');
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const browser = await chromium.launch(options);
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const report = [];
try {
  await page.goto(process.env.HOLO_URL || 'http://127.0.0.1:5173/');
  await page.waitForFunction(() => window.__holo?.gallery.instance()?.active, null, { timeout: 90000 });
  await page.evaluate(() => {
    const gallery = window.__holo.gallery.instance();
    Object.assign(gallery.query, { search: '', set: '151', rarity: 'Ultra Rare' });
    gallery.applyFilters();
  });
  await page.waitForFunction(() => {
    const s = window.__holo.gallery.stats();
    return s.filtered > 0 && s.visible > 0 && s.pending === 0;
  }, null, { timeout: 90000 });
  const galleryLoad = await page.evaluate(() => window.__holo.gallery.stats());
  if (galleryLoad.failed || galleryLoad.visibleFailed) throw new Error('Double Rare gallery upload failed');
  await page.screenshot({ path: join(out, 'gallery-loaded.png') });
  await page.evaluate(async () => { await window.__holo.gallery.close(); window.__holo.hideUI(); });
  for (const number of ['183', '192', '184']) {
    await page.evaluate(async number => {
      const h = window.__holo;
      await h.setCard(`pokemon:sv03.5-${number}:holo`);
      h.lighting.setPreset('Studio'); h.lighting.playing = false; h.pose(0, 0, 0);
    }, number);
    await page.waitForTimeout(300);
    for (const [name, yaw, pitch] of [['neutral', 0, 0], ['shallow-left', -12, 0], ['shallow-right', 12, 0], ['reflection', -15, -15], ['grazing', 65, 0]]) {
      await page.evaluate(([y, p]) => window.__holo.pose(y, p, 0), [yaw, pitch]);
      await page.waitForTimeout(180);
      await page.screenshot({ path: join(out, `${number}-${name}.png`) });
    }
    // Same camera, lights, geometry, transform and tone mapping, switching only
    // between the production viewer and instanced gallery materials.
    await page.evaluate(async number => {
      const h = window.__holo;
      const { DataArrayTexture, DataTexture, FloatType, RGBAFormat, LinearFilter, NearestFilter, SRGBColorSpace, InstancedMesh, Object3D } = await import('/node_modules/three/build/three.webgpu.js');
      const { GalleryMaterial } = await import('/src/gallery/GalleryMaterial.ts');
      const { doubleRareProfile } = await import('/src/materials/profiles/doubleRare.ts');
      const { galleryOpticalLayers } = await import('/src/gallery/GalleryBatch.ts');
      const { PREVIEW_ARRAY_SIZES } = await import('/src/card/CardPreviewPreparation.ts');
      const definition = h.cards.find(c => c.id === `pokemon:sv03.5-${number}:holo`);
      const preview = await h.cpuPreparation.preparePreview(definition, new AbortController().signal);
      const arrays = preview.images.map((data, i) => {
        const t = new DataArrayTexture(data, ...PREVIEW_ARRAY_SIZES[i], 1);
        t.minFilter = t.magFilter = LinearFilter; t.needsUpdate = true;
        if (!i) t.colorSpace = SRGBColorSpace;
        return t;
      });
      const parameters = new DataTexture(preview.parameters, 44, 1, RGBAFormat, FloatType);
      parameters.minFilter = parameters.magFilter = NearestFilter; parameters.needsUpdate = true;
      const stars = await h.factory.assets.load(doubleRareProfile.maps.direction, false);
      const exact = Object.fromEntries(await Promise.all(Object.entries(preview.ultraRareMaps).map(async ([k, path]) => [k, await h.factory.assets.load(path, k === 'front')])));
      const material = new GalleryMaterial(arrays, parameters, galleryOpticalLayers(preview.parameters), undefined, exact);
      let focus;
      h.scene.traverse(o => { if (Array.isArray(o.material) && o.material[0] === h.material()) focus = o; });
      const instance = new InstancedMesh(focus.geometry, [material, ...focus.material.slice(1)], 1);
      instance.frustumCulled = false; instance.visible = false; h.scene.add(instance);
      window.review = { focus, instance, material, arrays, parameters, transform: new Object3D() };
    }, number);
    for (const [name, yaw, pitch] of [['neutral', 0, 0], ['shallow', 12, 0], ['reflection', -15, -15]]) {
      await page.evaluate(([y, p]) => { window.__holo.pose(y, p, 0); window.review.focus.visible = true; window.review.instance.visible = false; }, [yaw, pitch]);
      await page.waitForTimeout(180);
      await page.screenshot({ path: join(out, `${number}-viewer-${name}.png`) });
      await page.evaluate(() => {
        const r = window.review; r.focus.updateMatrixWorld(); r.instance.setMatrixAt(0, r.focus.matrixWorld);
        r.instance.instanceMatrix.needsUpdate = true; r.focus.visible = false; r.instance.visible = true;
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(out, `${number}-gallery-${name}.png`) });
    }
    await page.evaluate(() => {
      const r = window.review; r.focus.visible = true; r.instance.removeFromParent(); r.instance.dispose();
      r.material.dispose(); r.arrays.forEach(t => t.dispose()); r.parameters.dispose();
    });
    // Consecutive poses are saved for motion review; no time-dependent pattern.
    for (let yaw = -40; yaw <= 40; yaw += 5) {
      await page.evaluate(y => window.__holo.pose(y, -8, 0), yaw);
      await page.waitForTimeout(90);
      await page.screenshot({ path: join(out, `${number}-motion-${yaw + 40}.png`) });
    }
    report.push(await page.evaluate(() => window.__holo.stats()));
  }
  await writeFile(join(out, 'report.json'), JSON.stringify({ report, galleryLoad, errors }, null, 2));
  console.log(JSON.stringify({ cards: report.map(x => ({ card: x.card, frameMs: x.frameMs })), errors }));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }


