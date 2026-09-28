import { chromium } from 'playwright';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const out = join(process.cwd(), 'artifacts', process.env.GALLERY_OUTPUT || 'gallery'); await mkdir(out, { recursive: true });
const options = { headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] };
if (!existsSync(chromium.executablePath())) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const path = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const browser = await chromium.launch(options);
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
const errors = [], assetWarnings = [], report = { errors, assetWarnings, snapshots: [] };
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => {
  if (message.type() !== 'error') return;
  const text = message.text();
  // TCGdex's known duplicate CORS header exercises the existing local fallback.
  if (text.includes('assets.tcgdex.net') || text === 'Failed to load resource: net::ERR_FAILED') assetWarnings.push(text);
  else errors.push(text);
});
const snapshot = async label => {
  const data = await page.evaluate(() => ({ gallery: window.__holo.gallery.stats(), memory: { ...window.__holo.renderer.info.memory }, cpu: window.__holo.cpuPreparation.stats(), frameMs: window.__holo.stats().frameMs }));
  report.snapshots.push({ label, ...data }); console.log(label, JSON.stringify(data)); return data;
};
try {
  await page.goto(`http://127.0.0.1:5173/${process.env.GALLERY_QUERY || ''}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  await page.getByRole('button', { name: 'Gallery', exact: true }).click();
  await page.waitForFunction(() => window.__holo.gallery.stats()?.visible >= 8, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, 'gallery.png') });
  await snapshot('initial');
  await page.mouse.move(650, 530); await page.waitForTimeout(800);
  assert.ok((await snapshot('tilt')).gallery.tilted >= 3);
  await page.mouse.move(5, 5); await page.waitForTimeout(1800);
  assert.equal((await snapshot('neutral')).gallery.tilted, 0);
  await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill('Lugia');
  await page.waitForTimeout(1000);
  assert.ok((await snapshot('search')).gallery.filtered > 0);
  await page.getByRole('combobox', { name: 'Game', exact: true }).selectOption('Yu-Gi-Oh!');
  await page.waitForTimeout(100); assert.equal((await snapshot('intersection')).gallery.filtered, 0);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  for (let pass = 0; pass < 3; pass++) {
    for (const fraction of [0, .2, .4, .6, .8, 1, .5, 0]) {
      await page.locator('.gallery-viewport').evaluate((el, fraction) => { el.scrollTop = (el.scrollHeight - el.clientHeight) * fraction; }, fraction);
      await page.waitForTimeout(500);
    }
    const state = await snapshot(`scroll-${pass}`);
    assert.ok(state.gallery.domCards <= 48); assert.ok(state.cpu.previewBytes <= state.cpu.previewBudget);
    assert.equal(state.memory.texturesSize, report.snapshots.find(s => s.label === 'initial').memory.texturesSize);
  }
  await page.getByRole('combobox', { name: 'Gallery lighting' }).selectOption('Blacklight'); await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, 'blacklight.png') });
  await page.getByRole('combobox', { name: 'Gallery lighting' }).selectOption('Moving light'); await page.waitForTimeout(800);
  await page.screenshot({ path: join(out, 'moving-light.png') });
  await page.getByRole('combobox', { name: 'Gallery lighting' }).selectOption('Studio');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill(i % 2 ? 'Lugia' : 'Charizard');
    await page.waitForTimeout(600);
    await page.locator('.gallery-card').first().click();
    await page.waitForFunction(() => !window.__holo.gallery.stats()?.active, null, { timeout: 90000 });
    await snapshot(`focused-${i}`);
    await page.getByRole('button', { name: 'Gallery', exact: true }).click();
    await page.waitForFunction(() => window.__holo.gallery.stats()?.active);
    await page.waitForTimeout(500); await snapshot(`returned-${i}`);
  }
  assert.equal(report.snapshots.find(s => s.label === 'returned-0').memory.total, report.snapshots.find(s => s.label === 'returned-2').memory.total);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.locator('.gallery-viewport').evaluate(el => { el.scrollTop = 1450; });
  await page.waitForTimeout(900);
  const savedScroll = (await snapshot('before-restore')).gallery.scrollTop;
  const visibleIndex = await page.locator('.gallery-viewport').evaluate(el => {
    const viewport = el.getBoundingClientRect();
    return [...el.querySelectorAll('.gallery-card.is-ready')].find(button => {
      const rect = button.getBoundingClientRect(); return rect.top > viewport.top && rect.bottom < viewport.bottom;
    })?.dataset.cardIndex;
  });
  assert.ok(visibleIndex); await page.locator(`[data-card-index="${visibleIndex}"]`).click();
  await page.waitForFunction(() => !window.__holo.gallery.stats()?.active, null, { timeout: 90000 });
  await page.getByRole('button', { name: 'Gallery', exact: true }).click();
  await page.waitForTimeout(500);
  assert.equal((await snapshot('scroll-restored')).gallery.scrollTop, savedScroll);
  await page.getByRole('button', { name: 'Back to viewer', exact: true }).click();
  await page.waitForFunction(() => !window.__holo.gallery.stats()?.active, null, { timeout: 90000 });
  await page.evaluate(async () => { await window.__holo.pack.open('archive-01'); });
  await snapshot('pack-open');
  await page.evaluate(() => window.__holo.pack.close());
  await page.getByRole('button', { name: 'Gallery', exact: true }).click();
  // Synthetic metadata stresses the real DOM/rendering boundary without new assets.
  await page.evaluate(async () => {
    const h = window.__holo, original = [...h.cards];
    for (let i = 0; i < 10000; i++) h.cards.push({ ...original[i % original.length], id: `stress:${i}` });
    h.gallery.instance().show();
  });
  await page.locator('.gallery-viewport').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(2000);
  const large = await snapshot('10000-cards'); assert.ok(large.gallery.filtered >= 10000); assert.ok(large.gallery.domCards <= 48);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(1800);
  await page.screenshot({ path: join(out, 'mobile.png') }); await snapshot('mobile');
  assert.equal(errors.length, 0, errors.join('\n'));
} catch (error) {
  report.failure = String(error); console.error(error); await page.screenshot({ path: join(out, 'failure.png') }); process.exitCode = 1;
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
