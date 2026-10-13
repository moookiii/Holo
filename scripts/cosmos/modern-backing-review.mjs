import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const stage = process.env.COSMOS_REVIEW_STAGE || 'after';
const out = join(process.cwd(), 'artifacts/cosmos-modern-backing', stage);
await mkdir(out, { recursive: true });
let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA, 'ms-playwright');
  for (const dir of (await readdir(root)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const exe = join(root, dir, 'chrome-win64/chrome.exe');
    if (existsSync(exe)) { executablePath = exe; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true,
  args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
const errors = [], report = [];
let inventory;
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('response', r => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) errors.push(`${r.status()} ${r.url()}`); });
try {
  await page.goto(process.env.HOLO_URL || 'http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(() => window.__holo?.gallery.instance()?.openingReady, null, { timeout: 90000 });
  if (stage === 'after') {
    inventory = await page.evaluate(async () => {
      const { resolveCardProfile } = await import('/src/materials/profiles/resolveCardProfile.ts');
      const { previewOptics } = await import('/src/card/PreviewOptics.ts');
      const counts = {}, mismatches = [];
      const cosmos = new Set(['pokemon-base-set-2-cosmos', 'pokemon-cosmos', 'pokemon-cosmos-hd', 'svp-cosmos', 'pokemon-evolutions-holo']);
      for (const c of window.__holo.cards) {
        if (!cosmos.has(c.profile)) continue;
        const p = resolveCardProfile(c), series = c.pokemon?.seriesId ?? 'authored';
        const modern = ['bw', 'xy', 'sm', 'swsh', 'sv', 'me'].includes(series);
        counts[series] = (counts[series] || 0) + 1;
        if (p.id !== (modern ? `modern-${c.profile}` : c.profile)
          || Math.abs(previewOptics(c, p)[20] - (modern ? .82 : p.surface.substrateDarkening ?? 0)) > 1e-6)
          mismatches.push(c.id);
      }
      return { counts, mismatches };
    });
    assert.deepEqual(inventory.mismatches, []);
  }
  const targets = await page.evaluate(() => {
    const h = window.__holo;
    const result = ['pokemon:swshbsp-95:holo', 'pokemon:base4-1:holo'];
    for (const series of ['bw', 'xy', 'sm', 'sv', 'me']) {
      const c = h.cards.find(c => c.pokemon?.seriesId === series && c.profile !== 'print-only'
        && ['pokemon-base-set-2-cosmos', 'svp-cosmos'].includes(c.profile));
      if (c) result.push(c.id);
    }
    return result;
  });
  await page.evaluate(async id => { await window.__holo.gallery.close(id); window.__holo.hideUI(); window.__holo.zoom(.85); }, targets[0]);
  for (const id of process.argv.includes('--audit-only') ? [] : targets) {
    await page.evaluate(async id => { await window.__holo.setCard(id); }, id);
    const material = await page.evaluate(() => {
      const m = window.__holo.material();
      return { darkening: m.optics.substrateDarkening.value, reflection: m.optics.substrateReflection.value,
        foilReflectance: m.optics.foilReflectance.value, field: m.fieldTextureNode.value.image.width };
    });
    assert.equal(await page.evaluate(() => window.__holo.stats().card), id);
    if (stage === 'after') assert.equal(material.darkening, id.includes('base4-') ? 0 : .82);
    for (const [label, light, yaw, pitch, phase] of [
      ['front', 'Studio', 0, 0, 0], ['tilt', 'Studio', -25, 4, 0],
      ['specular', 'Strip', -15, -15, 0], ['grazing', 'Strip', 65, 0, 0],
      ['dark', 'Low key', 8, 0, 0], ['moving-a', 'Moving light', 0, 0, .3],
      ['moving-b', 'Moving light', 0, 0, 2.3],
    ]) {
      await page.evaluate(([light, yaw, pitch, phase]) => {
        const h = window.__holo; h.lighting.setPreset(light); h.lighting.playing = false;
        h.lighting.phase = phase; h.lighting.update(0); h.pose(yaw, pitch, 0);
      }, [light, yaw, pitch, phase]);
      await page.waitForTimeout(350);
      await page.screenshot({ path: join(out, `${id.replaceAll(':', '-')}-${label}.png`) });
    }
    report.push({ id, material });
    console.log('Captured', stage, id);
  }
  assert.deepEqual(errors, []);
} finally {
  const name = process.argv.includes('--audit-only') ? 'inventory.json' : 'report.json';
  await writeFile(join(out, name), JSON.stringify({ stage, inventory, report, errors }, null, 2));
  await browser.close();
}
