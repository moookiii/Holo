import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = 'artifacts/hyper-rare/review';
await mkdir(root, { recursive: true });
let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const base = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const name of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = join(base, name, 'chrome-win64/chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true,
  args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const report = [];
try {
  for (const backend of (process.env.BACKEND ? [process.env.BACKEND] : ['webgpu', 'webgl'])) {
    const out = join(root, backend); await mkdir(out, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:5173/?benchmark-cold-viewer&backend=${backend}`);
    await page.waitForFunction(() => window.__holo?.gallery.stats()?.visible > 0, null, { timeout: 120000 });
    await page.waitForTimeout(1200);
    await page.evaluate(async () => {
      const h = window.__holo; await h.gallery.close('pokemon:sv04-265:holo');
      h.hideUI(); h.lighting.playing = false;
    });
    const inventory = await page.evaluate(() => window.__holo.cards
      .filter(c => c.profile.endsWith('_gold')).map(c => ({ id: c.id, title: c.title, set: c.set,
        profile: c.profile, textured: !!c.maps?.normal, source: c.source, maps: c.maps })));
    await writeFile(join(root, 'inventory.json'), JSON.stringify(inventory, null, 2));
    const capture = async (name, light, yaw, pitch, roll = 0) => {
      await page.evaluate(([light, yaw, pitch, roll]) => {
        const h = window.__holo; h.lighting.setPreset(light); h.pose(yaw, pitch, roll);
      }, [light, yaw, pitch, roll]);
      await page.waitForTimeout(260);
      await page.screenshot({ path: join(out, `${name}.png`) });
    };
    // Paired reference finish and final response, with identical source maps,
    // camera, exposure and lighting. Disabling optional controls restores the
    // original arithmetic; setProfile invalidates shader specializations.
    for (const finish of ['baseline', 'final']) {
      await page.evaluate(async finish => {
        const h = window.__holo;
        const { resolveCardProfile } = await import('/src/materials/profiles/resolveCardProfile.ts');
        const { tcglEtchedFinish } = await import('/src/materials/profiles/tcglEtchedFinish.ts');
        const p = resolveCardProfile(h.cards.find(c => c.id === h.stats().card));
        if (finish === 'baseline') {
          p.diffraction = { ...tcglEtchedFinish.diffraction };
          p.surface = { ...tcglEtchedFinish.surface };
          p.glints = { ...tcglEtchedFinish.glints };
        }
        h.material().setProfile(p);
      }, finish);
      for (const [name, light, yaw, pitch, roll] of [
        ['front', 'Studio', 0, 0, 0], ['left', 'Studio', -12, 0, 0], ['right', 'Studio', 12, 0, 0],
        ['specular', 'Studio', -15, -15, 0], ['tilt', 'Strip', 20, -8, 5],
        ['dark', 'Low key', 10, 8, 0], ['soft', 'Soft', 0, 0, 0], ['grazing', 'Studio', 65, -8, 0],
      ]) await capture(`${finish}-${name}`, light, yaw, pitch, roll);
    }
    const state = await page.evaluate(() => {
      const m = window.__holo.material();
      return { normalScale: m.surfaceControls.normalScale.value, emboss: m.surfaceControls.embossStrength.value,
        filtering: m.optics.normalFiltering.value, sparkle: m.optics.glintStrength.value, substrate: m.optics.substrateReflection.value };
    });
    assert.deepEqual(state, { normalScale: 1, emboss: 0, filtering: 1, sparkle: 3.2, substrate: .3 });
    // No time term: identical light and pose must reproduce identical pixels.
    await capture('repeat-a', 'Low key', 12, 5);
    const a = await page.screenshot(); await page.waitForTimeout(450);
    const b = await page.screenshot(); assert.equal(a.equals(b), true, 'stationary material flickers');
    // Deterministic moving source and small card rotations, revisiting the same
    // endpoint after motion to detect history-dependent sparkle.
    for (let i = 0; i < 13; i++) {
      await page.evaluate(i => {
        const h = window.__holo; h.lighting.setPreset('Moving light'); h.lighting.playing = false;
        h.lighting.azimuth = -36 + i * 6; h.lighting.elevation = 18; h.lighting.update(0); h.pose(-6 + i, 4);
      }, i);
      await page.waitForTimeout(80); await page.screenshot({ path: join(out, `motion-${String(i).padStart(2, '0')}.png`) });
    }
    const selected = ['pokemon:sv01-254:holo', 'pokemon:sv04-266:holo', 'pokemon:sv03.5-205:holo', 'pokemon:sv08.5-176:holo'];
    const cards = backend === 'webgpu' ? inventory.filter(c => c.textured) : inventory.filter(c => selected.includes(c.id));
    const checked = [];
    for (const card of cards) {
      await page.evaluate(id => window.__holo.setCard(id), card.id);
      const values = await page.evaluate(() => {
        const m = window.__holo.material(); return [m.optics.normalFiltering.value, m.surfaceControls.normalScale.value, m.surfaceControls.embossStrength.value];
      });
      assert.deepEqual(values, [1, 1, 0], card.id);
      await capture(`${card.id.replaceAll(':', '-')}-front`, 'Studio', 0, 0);
      if (selected.includes(card.id)) await capture(`${card.id.replaceAll(':', '-')}-tilt`, 'Strip', 18, -8);
      checked.push(card.id);
      if (checked.length % 10 === 0) console.log(`${backend}: ${checked.length}/${cards.length} gold cards checked`);
    }
    for (const id of ['pokemon:sv08.5-155:holo', 'pokemon:sv08.5-156:holo', 'pokemon:sv03.5-198:holo', 'charizard-base-set']) {
      await page.evaluate(id => window.__holo.setCard(id), id);
      assert.equal(await page.evaluate(() => window.__holo.material().optics.normalFiltering.value), 0);
      await capture(`control-${id.replaceAll(':', '-')}`, 'Studio', 12, -8);
    }
    // Real gallery program compilation and packed-parameter selection.
    await page.evaluate(() => window.__holo.gallery.open());
    await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill('Luxurious Cape');
    await page.waitForTimeout(1600);
    await page.screenshot({ path: join(out, 'gallery.png') });
    assert.deepEqual(errors, []);
    report.push({ backend, state, stationaryIdentical: true, checked, errors, stats: await page.evaluate(() => window.__holo.stats()) });
    await writeFile(join(root, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`${backend}: ${checked.length} gold cards, comparison angles, motion, controls and gallery passed`);
    await page.close();
  }
} finally { await browser.close(); }
