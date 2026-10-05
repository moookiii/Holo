import { chromium, firefox } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const out = join(process.cwd(), 'artifacts', 'ancient-mew-loading');
await mkdir(out, { recursive: true });
const engine = process.env.HOLO_BROWSER === 'firefox' ? firefox : chromium;
const browserName = engine.name();
let executablePath = engine.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(root)).filter(name => new RegExp(`^${browserName}-\\d+$`).test(name)).sort().reverse()) {
    const candidate = browserName === 'firefox' ? join(root, version, 'firefox', 'firefox.exe') : join(root, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await engine.launch({ executablePath, headless: true, ...(browserName === 'chromium' ? { args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(() => window.__holo?.ready && window.__holo.gallery.stats()?.active, null, { timeout: 120000 });
  await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill('Ancient Mew');
  await page.locator('.gallery-card.is-ready').waitFor({ timeout: 60000 });
  const generation = await page.evaluate(async () => {
    const { generateAncientMew } = await import('/src/materials/patterns/AncientMew.ts');
    const bitmap = await createImageBitmap(await (await fetch('/cards/ancient-mew/flakes.png')).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height), context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0);
    const rgba = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const data = new Uint8Array(bitmap.width * bitmap.height);
    for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4];
    const image = { width: bitmap.width, height: bitmap.height, data };
    bitmap.close();
    const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
    const samples = [];
    let field;
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      field = generateAncientMew({ kind: 'ancient-mew', seed: 2000, aspect: 6.3 / 8.8, scale: 1 }, 2048, image);
      samples.push(performance.now() - start);
    }
    return { samples, width: field.width, height: field.height, direction: await hash(field.direction), relief: await hash(field.relief) };
  });
  await page.evaluate(async baseline => {
    const CardFactory = window.__holo.factory.constructor;
    const CardMapLoader = window.__holo.factory.maps.constructor;
    window.mewTimings = {};
    for (const [object, name] of [[CardFactory.prototype, 'prepareProfile'], [CardMapLoader.prototype, 'load'], [CardFactory.prototype, 'uploadCardResources'], [CardFactory.prototype, 'compile'], [CardFactory.prototype, 'create']]) {
      const original = object[name];
      object[name] = async function(...args) {
        const rootName = args[0]?.name;
        if (baseline && name === 'compile') {
          args[0].traverse(object => {
            for (const material of Array.isArray(object.material) ? object.material : []) if ('compactOptics' in material) material.compactOptics = false;
          });
          // Disable the Ancient Mew driver batch for the original serial path.
          args[0].name = `baseline:${rootName}`;
        }
        const start = performance.now();
        try { return await original.apply(this, args); }
        finally {
          if (baseline && name === 'compile') args[0].name = rootName;
          (window.mewTimings[name] ??= []).push(performance.now() - start);
        }
      };
    }
    const backend = window.__holo.renderer.backend, original = backend.createRenderPipeline;
    window.mewPipelines = [];
    backend.createRenderPipeline = function(object, promises) {
      const entry = { fragmentBytes: object.pipeline.fragmentProgram.code.length, started: performance.now(), fragment: object.pipeline.fragmentProgram.code };
      const count = promises?.length ?? 0;
      const value = original.call(this, object, promises);
      entry.syncMs = performance.now() - entry.started;
      window.mewPipelines.push(entry);
      if (promises) void Promise.all(promises.slice(count)).then(() => { entry.driverMs = performance.now() - entry.started; });
      return value;
    };
  }, process.env.MEW_BASELINE === '1');
  const started = Date.now();
  await page.locator('.gallery-card.is-ready').click();
  await page.waitForFunction(() => !window.__holo.gallery.stats()?.active && window.__holo.stats().card === 'ancient-mew', null, { timeout: 90000 });
  const openingMs = Date.now() - started;
  const stages = await page.evaluate(() => window.mewTimings);
  const shaders = await page.evaluate(() => {
    const h = window.__holo;
    const mesh = h.scene.children.find(object => object.name === 'card:ancient-mew');
    return mesh?.material.slice(0, 2).map(material => ({ compact: material.compactOptics, iridescence: material.useIridescence, anisotropy: material.useAnisotropy, key: material.customProgramCacheKey() }));
  });
  await page.evaluate(() => window.__holo.hideUI());
  for (const [name, yaw, pitch, light] of [['front', 0, 0, 'Studio'], ['tilt', 24, 12, 'Studio'], ['grazing', -38, 18, 'Strip'], ['back', 180, 0, 'Studio']]) {
    await page.evaluate(([yaw, pitch, light]) => {
      window.__holo.lighting.setPreset(light); window.__holo.lighting.playing = false;
      window.__holo.pose(yaw, pitch); window.__holo.zoom(.85);
    }, [yaw, pitch, light]);
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(out, `${process.env.REVIEW_SUFFIX || 'current'}-${name}.png`) });
  }
  const edits = process.env.MEW_BASELINE === '1' ? undefined : await page.evaluate(() => {
    const h = window.__holo, material = h.scene.children.find(object => object.name === 'card:ancient-mew').material[0];
    const profile = h.profiles.find(profile => profile.id === 'pokemon-ancient-mew');
    const fields = { primary: { direction: material.fieldTextureNode.value, relief: material.reliefTextureNode.value } };
    const original = material.customProgramCacheKey(), version = material.version;
    material.setProfile({ ...profile, surface: { ...profile.surface, iridescence: .2, anisotropy: .3 }, mapSettings: { embossStrength: .1 } }, fields);
    const enabled = material.useIridescence && material.useAnisotropy && material.version > version && material.customProgramCacheKey() !== original;
    material.setProfile(profile, fields);
    return { enabled, restored: !material.useIridescence && !material.useAnisotropy && material.customProgramCacheKey() === original };
  });
  if (edits) assert.ok(edits.enabled && edits.restored, 'Live profile edits must invalidate specialization and restore the original graph');
  assert.deepEqual(errors, []);
  const pipelines = await page.evaluate(() => window.mewPipelines);
  const backend = await page.evaluate(() => window.__holo.stats().backend);
  for (const [i, pipeline] of pipelines.entries()) {
    await writeFile(join(out, `${process.env.REVIEW_SUFFIX || 'current'}-${i}.glsl`), pipeline.fragment);
    delete pipeline.fragment;
  }
  const report = { browser: browserName, backend, generation, openingMs, stages, shaders, pipelines, edits, errors };
  await writeFile(join(out, `${process.env.REVIEW_SUFFIX || 'current'}.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
