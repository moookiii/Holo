import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const out = join(process.cwd(), 'artifacts/favorites-binder'); await mkdir(out, { recursive: true });
let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) for (const dir of (await readdir(join(process.env.LOCALAPPDATA, 'ms-playwright'))).filter(n => /^chromium-/.test(n)).sort().reverse()) {
  const path = join(process.env.LOCALAPPDATA, 'ms-playwright', dir, 'chrome-win64/chrome.exe');
  if (existsSync(path)) { executablePath = path; break; }
}
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const errors = [], report = { errors, cases: [], captures: [] };
page.on('pageerror', e => { errors.push(String(e)); console.log('PAGE ERROR', String(e)); });
page.on('console', e => { if (e.type() === 'error' && !/tcgdex|net::ERR_FAILED/.test(e.text())) { errors.push(e.text()); console.log('CONSOLE ERROR', e.text().slice(0, 400)); } });
const state = () => page.evaluate(() => window.__holo.gallery.stats());
const ready = () => page.waitForFunction(() => { const s = window.__holo?.gallery.stats(); return s?.binder && s.visible === s.visibleExpected && !s.visibleFailed && !s.preparing; }, null, { timeout: 240000 });
const capture = async name => { await page.screenshot({ path: join(out, `${name}.png`) }); report.captures.push(name); };
async function collection(count) {
  await page.evaluate(count => {
    const g = window.__holo.gallery.instance();
    const source = g.catalog.cards();
    // Existing canonical ordering is retained. Include live foil + authored etching.
    const preferred = ['pokemon:sv08.5-155:holo', 'pokemon:sv08.5-156:holo'];
    const selected = [...source.filter(c => preferred.includes(c.id)), ...source.filter(c => c.set.includes('151') && !preferred.includes(c.id)), ...source.filter(c => !c.set.includes('151') && !preferred.includes(c.id))].slice(0, count);
    g.favorites.ids = new Set(selected.map(c => c.id));
    localStorage.setItem('holo:gallery-favorites:v1', JSON.stringify([...g.favorites.ids]));
    if (g.binder?.active) g.binder.refresh(g.favorites.filter(g.catalog.cards(), true)); else g.openBinder();
  }, count);
  await page.waitForFunction(count => window.__holo?.gallery.stats()?.filtered === count, count);
  await ready();
  const s = await state(); assert.equal(s.filtered, count); assert.equal(s.visible, Math.min(count, 24));
  report.cases.push({ count, ...s }); console.log('COUNT', count, 'visible', s.visible, 'resident', s.residentCards);
}
try {
  await page.goto(process.env.BINDER_URL || 'http://127.0.0.1:5173/?backend=webgl', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__holo?.gallery.stats()?.active, null, { timeout: 120000 });
  await collection(Number(process.env.BINDER_COUNT || 24)); await capture('spread');
  if (process.env.BINDER_QUICK) { console.log(JSON.stringify(await state())); }
  else {
    for (const count of [0, 1, 9, 10, 12, 13, 18, 19, 24, 25, 49]) { await collection(count); if ([0, 1, 25].includes(count)) await capture(`count-${count}`); }
    await page.getByRole('button', { name: 'Next binder spread', exact: true }).click();
    await page.waitForFunction(() => window.__holo.gallery.stats().turning, null, { timeout: 240000 });
    await page.evaluate(() => { const b = window.__holo.gallery.instance().binder; for (let i = 0; i < 20; i++) { void b.turn(1); void b.turn(-1); } });
    await page.evaluate(() => {
      const nav = window.__holo.gallery.instance().binder.navigation;
      window.binderAdvance = nav.advance;
      nav.turn.elapsed = .62;
      nav.advance = function(_, duration) { return window.binderAdvance.call(this, 0, duration); };
    });
    await page.waitForTimeout(100); await capture('turn');
    await page.evaluate(() => { window.__holo.gallery.instance().binder.navigation.advance = window.binderAdvance; });
    await page.waitForFunction(() => window.__holo.gallery.stats().spread === 1 && !window.__holo.gallery.stats().turning);
    await ready(); await capture('spread-2');
    const button = page.locator('.binder-card').first();
    await button.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => !window.__holo.gallery.stats().active, null, { timeout: 120000 });
    assert.equal(await page.evaluate(() => window.__holo.camera.position.x), 0);
    await page.evaluate(() => window.__holo.gallery.open()); await ready();
    assert.equal((await state()).spread, 1); await capture('viewer-return');
    await page.getByRole('button', { name: 'Previous binder spread', exact: true }).click();
    await page.waitForFunction(() => window.__holo.gallery.stats().spread === 0 && !window.__holo.gallery.stats().turning, null, { timeout: 240000 });
    await ready();
    for (let cycle = 0; cycle < 2; cycle++) {
      for (const [direction, target] of [[1, 1], [1, 2], [-1, 1], [-1, 0]]) {
        await page.getByRole('button', { name: direction === 1 ? 'Next binder spread' : 'Previous binder spread', exact: true }).click();
        await page.waitForFunction(target => { const s = window.__holo.gallery.stats(); return s.spread === target && !s.turning; }, target, { timeout: 240000 });
        await ready();
        assert.equal((await state()).visible, target === 2 ? 1 : 24);
        assert.ok((await state()).residentCards <= 48);
      }
    }
    await page.mouse.move(800, 440); await page.mouse.down(); await page.mouse.move(855, 475, { steps: 10 }); await page.mouse.up();
    await page.getByLabel('Gallery lighting', { exact: true }).last().selectOption('Moving light');
    await page.waitForTimeout(700); await capture('tilt-moving-light');
    await page.getByLabel('Gallery lighting', { exact: true }).last().selectOption('Low key');
    await page.waitForTimeout(300); await capture('low-key');
    await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(300); await capture('1280');
    await page.setViewportSize({ width: 1920, height: 1080 }); await page.waitForTimeout(300); await capture('1920');
    await collection(2);
    const materials = await page.evaluate(() => [...window.__holo.gallery.instance().binder.physical.pages.values()].flatMap(p => [...p.cards.values()].map(c => ({ id: c.definition.id, type: c.mesh.material[0].constructor.name, normal: c.definition.maps.normal, settings: c.definition.mapSettings }))));
    assert.equal(materials.length, 2); assert.ok(materials.every(m => m.type === 'HolographicMaterial' && m.normal && m.settings.embossStrength === 0));
    report.etchedMaterials = materials;
    for (const preset of ['Soft', 'Skim', 'Low key', 'Moving light']) {
      await page.getByLabel('Gallery lighting', { exact: true }).last().selectOption(preset);
      await page.waitForTimeout(350); await capture(`etched-${preset.replaceAll(' ', '-')}`);
    }
    await collection(1000);
    await page.waitForFunction(() => window.__holo.gallery.stats().neighborReady === 1, null, { timeout: 240000 });
    report.large = await state(); assert.ok(report.large.residentCards <= 48); assert.equal(report.large.visible, 24);
    const before = (await state()).filtered;
    const removedId = await page.locator('.binder-card').first().getAttribute('data-card-id');
    await page.locator('.binder-card').first().focus(); await page.keyboard.down('Shift'); await page.keyboard.press('Enter'); await page.keyboard.up('Shift');
    await page.waitForFunction(n => window.__holo.gallery.stats().filtered === n - 1, before); await ready();
    await page.getByRole('button', { name: '← Gallery', exact: true }).click();
    await page.waitForFunction(() => !window.__holo.gallery.stats().binder);
    assert.equal((await state()).binder, undefined);
    await page.waitForFunction(() => document.querySelectorAll('.gallery-card.is-ready').length > 0, null, { timeout: 120000 });
    assert.equal((await state()).active, true);
    const title = await page.evaluate(id => window.__holo.cards.find(c => c.id === id).title, removedId);
    await page.getByLabel('Search gallery cards', { exact: true }).fill(title);
    const removed = page.locator(`.gallery-card[data-card-id="${removedId}"]`);
    await removed.click({ modifiers: ['Shift'] });
    await page.getByRole('button', { name: 'Open Favorites binder', exact: true }).click(); await ready();
    assert.equal((await state()).filtered, before);
    await page.getByRole('button', { name: '← Gallery', exact: true }).click();
    await page.waitForFunction(() => !window.__holo.gallery.stats().binder);
    report.final = await state(); assert.deepEqual(errors, []);
  }
} finally { await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
