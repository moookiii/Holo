import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const out = join(process.cwd(), 'artifacts', process.env.SECRET_CAPTURE || 'secret-validation');
await mkdir(out, { recursive: true });
let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const folder of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = join(base, folder, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
const errors = [], reports = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
try {
  await page.goto(`http://127.0.0.1:5173/?lab&backend=${process.env.SECRET_BACKEND || 'webgpu'}`);
  await page.waitForFunction(() => window.__holo?.lab, null, { timeout: 120000 });
  await page.evaluate(() => { const h = window.__holo; h.lab.dispose(); h.hideUI(); h.setMode('rotate'); h.lighting.playing = false; });
  const cards = ['holo-yugioh-top-solemn-judgment', 'dark-magician-girl', 'ip-masquerena'];
  for (const id of process.env.SECRET_INTEGRATION_ONLY ? [] : cards) {
    await page.evaluate(id => window.__holo.setCard(id), id);
    for (const profile of ['ygo-secret', 'ygo-secret-early-tcg']) {
      await page.evaluate(profile => window.__holo.setProfile(profile), profile);
      assert.equal(await page.evaluate(() => window.__holo.material().optics.secretCuts), true);
      assert.equal(await page.evaluate(() => window.__holo.material().surfaceControls.embossStrength.value), 0);
      for (const [name, y, p, light, intensity, zoom] of [
        ['front', 0, 0, 'Studio', 1, 1], ['active', -12, -10, 'Strip', 1, 1],
        ['off', 32, 20, 'Low key', 1, 1], ['grazing', 80, 5, 'Skim', 1, 1],
        ['soft', -20, 12, 'Soft', 1, 1], ['close', -8, -5, 'Studio', 1, .65],
        ['dim', 0, 0, 'Studio', .2, 1], ['strong', -15, -15, 'Studio', 2, 1],
      ]) {
        await page.evaluate(([y,p,light,intensity,zoom]) => {
          const h = window.__holo; h.pose(y,p); h.zoom(zoom); h.lighting.setPreset(light); h.lighting.intensity = intensity; h.lighting.update(0);
        }, [y,p,light,intensity,zoom]);
        await page.waitForTimeout(220);
        await page.screenshot({ path: join(out, `${id}-${profile}-${name}.png`) });
      }
      reports.push(await page.evaluate(() => ({ ...window.__holo.stats(), secret: window.__holo.material().optics.secretCuts })));
    }
  }
  // Adjacent captures exercise both camera/card and light travel independently.
  await page.evaluate(() => { const h = window.__holo; h.zoom(1); h.lighting.intensity = 1; h.lighting.setPreset('Moving light'); });
  for (let frame = 0; frame < (process.env.SECRET_INTEGRATION_ONLY ? 0 : 24); frame++) {
    await page.evaluate(frame => {
      const h = window.__holo; h.pose(frame < 12 ? -18 + frame * 3 : 12, -8);
      if (frame >= 12) { h.lighting.azimuth = -50 + (frame - 12) * 9; h.lighting.update(0); }
    }, frame);
    await page.waitForTimeout(100);
    await page.screenshot({ path: join(out, `motion-${String(frame).padStart(2, '0')}.png`) });
  }
  // Exercise the actual CPU pack preparation and shared gallery material with
  // temporary test definitions. No rarity is falsely assigned in the catalog.
  const integration = await page.evaluate(async () => {
    const h = window.__holo;
    const { GalleryRenderer } = await import('/src/gallery/GalleryRenderer.ts');
    const specimens = ['holo-yugioh-top-solemn-judgment', 'dark-magician-girl'].map((id, i) => ({
      ...h.cards.find(c => c.id === id), id: `secret-test-${i}`, profile: 'ygo-secret', profileOverrides: undefined,
      yugioh: { rarity: 'Secret Rare', era: i ? 'early-tcg' : 'later-tcg' },
    }));
    const signal = new AbortController().signal;
    const prepared = await Promise.all(specimens.map(c => h.cpuPreparation.prepare(c, signal)));
    const packCard = await h.factory.realizeCardGpu(prepared[1]);
    const pack = { profile: packCard.mesh.material[0].optics.secretCuts, textures: !!prepared[1].fields.primary };
    packCard.dispose();
    h.scene.children.filter(c => c.name.startsWith('card:')).forEach(c => c.visible = false);
    const gallery = new GalleryRenderer(h.scene);
    for (let i = 0; i < specimens.length; i++) {
      const preview = await h.cpuPreparation.preparePreview(specimens[i], signal);
      gallery.upload(i, preview);
      gallery.place(i, 400 + i * 450, 500, 360, 525, 0, 0, 1280, 1000, h.camera);
    }
    gallery.mesh.visible = true; h.lighting.setPreset('Studio'); h.pose(0,0);
    window.__secretGallery = gallery;
    await h.renderer.compileAsync(h.scene, h.camera);
    return { pack, profiles: prepared.map(p => p.profile.id), gallery: gallery.stats() };
  });
  assert.equal(integration.pack.profile, true); assert.equal(integration.pack.textures, false);
  assert.deepEqual(integration.profiles, ['ygo-secret', 'ygo-secret-early-tcg']);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, 'gallery.png') });
  reports.push(integration);
  assert.deepEqual(errors, []);
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify({ reports, errors }, null, 2));
  console.log(JSON.stringify({ reports, errors }, null, 2));
  await browser.close();
}
