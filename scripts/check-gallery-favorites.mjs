import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const options = { headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] };
if (process.env.BROWSER_EXECUTABLE) options.executablePath = process.env.BROWSER_EXECUTABLE;
else if (!existsSync(chromium.executablePath())) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const path = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const browser = await chromium.launch(options);
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
const key = 'holo:gallery-favorites:v1';
const card = () => page.locator('.gallery-card').first();
const star = () => page.getByRole('button', { name: 'Show favorites only', exact: true });
const shift = target => target.click({ modifiers: ['Shift'] });
const ids = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), key);
const ready = async () => {
  await page.waitForFunction(() => window.__holo?.gallery.stats()?.active, null, { timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll('.gallery-card.is-ready').length > 0, null, { timeout: 120000 });
};
try {
  await page.goto(process.env.FAVORITES_TEST_URL || 'http://127.0.0.1:5173/'); await ready();
  console.log('Gallery ready');
  // Give the browser a fresh persisted collection, including an obsolete ID.
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify(['deleted-card'])), key);
  await page.reload(); await ready();
  console.log('Stale ID reload passed');
  assert.equal(await page.locator('.gallery-card.is-favorite').count(), 0);
  const firstId = await card().getAttribute('data-card-id');
  await page.waitForFunction(() => { const s = window.__holo.gallery.stats(); return s.pending === 0 && s.queued === 0; }, null, { timeout: 120000 });
  console.log('Preview loads settled');
  const before = await page.evaluate(() => {
    const g = window.__holo.gallery.instance();
    window.favoriteResources = { entries: g.entries, residency: g.residency, graphics: g.graphics };
    return { uploads: g.graphics.stats().uploads, materials: g.graphics.stats().materials, requests: window.__holo.cpuPreparation.stats().previewRequests };
  });
  await shift(card()); assert.ok((await ids()).includes(firstId));
  assert.equal(await card().evaluate(el => el.classList.contains('is-favorite')), true);
  await shift(card()); assert.ok(!(await ids()).includes(firstId));
  await card().evaluate(el => { for (let i = 0; i < 21; i++) el.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1, shiftKey: true })); });
  assert.equal((await ids()).filter(id => id === firstId).length, 1);
  const after = await page.evaluate(() => {
    const g = window.__holo.gallery.instance();
    if (g.entries !== window.favoriteResources.entries || g.residency !== window.favoriteResources.residency || g.graphics !== window.favoriteResources.graphics) throw Error('Rendering resources replaced');
    return { uploads: g.graphics.stats().uploads, materials: g.graphics.stats().materials, requests: window.__holo.cpuPreparation.stats().previewRequests };
  });
  assert.deepEqual(after, before);
  console.log('Toggles, rapid clicks, and unchanged rendering resources passed');
  await page.reload(); await ready();
  assert.equal(await page.locator(`[data-card-id="${firstId}"].is-favorite`).count(), 1);
  console.log('Persistence passed');
  // Add a second game's favorite, then exercise Pokémon's native facets.
  await page.getByLabel('Game', { exact: true }).selectOption('Yu-Gi-Oh!');
  await page.waitForFunction(() => window.__holo.cards.find(c => c.id === document.querySelector('.gallery-card')?.getAttribute('data-card-id'))?.franchise === 'Yu-Gi-Oh!');
  await shift(card());
  await page.getByLabel('Game', { exact: true }).selectOption('Pokémon');
  await page.waitForFunction(() => window.__holo.cards.find(c => c.id === document.querySelector('.gallery-card')?.getAttribute('data-card-id'))?.franchise === 'Pokémon');
  const pokemonId = await card().getAttribute('data-card-id');
  if (!(await ids()).includes(pokemonId)) await shift(card());
  await star().click(); assert.equal(await star().getAttribute('aria-pressed'), 'true');
  await page.waitForFunction(() => document.querySelectorAll('.gallery-card').length === 1);
  for (const label of ['Set', 'Rarity', 'Finish', 'Category']) {
    const select = page.getByLabel(label, { exact: true });
    const value = await page.evaluate(([id, label]) => {
      const g = window.__holo.gallery.instance(), c = g.catalog.cards().find(c => c.id === id);
      return label === 'Set' ? c.pokemon?.setName ?? c.set.split(' · ')[0] : label === 'Rarity' ? c.pokemon?.rarity : label === 'Category' ? c.pokemon?.category : c.pokemon?.variant ?? 'holo';
    }, [pokemonId, label]);
    if (value) {
      await select.selectOption(value);
      assert.equal(await page.evaluate(() => window.__holo.gallery.stats().filtered), 1);
      await select.selectOption('');
    }
  }
  await page.getByLabel('Search gallery cards').fill('no-card-matches-this');
  assert.equal(await page.evaluate(() => window.__holo.gallery.stats().filtered), 0);
  await page.getByLabel('Search gallery cards').fill('');
  await page.getByLabel('Game', { exact: true }).selectOption('');
  await page.waitForFunction(() => document.querySelectorAll('.gallery-card').length === 2);
  await page.waitForFunction(() => { const s = window.__holo.gallery.stats(); return s.visible === s.visibleExpected && s.visibleExpected === 2; }, null, { timeout: 120000 });
  await mkdir('artifacts/gallery-favorites', { recursive: true });
  await page.screenshot({ path: 'artifacts/gallery-favorites/active.png' });
  await page.setViewportSize({ width: 650, height: 850 });
  assert.equal(await page.locator('.gallery-card.is-favorite').count(), 2);
  await shift(page.locator(`[data-card-id="${pokemonId}"]`));
  assert.equal(await page.locator('.gallery-card').count(), 1);
  await shift(card()); assert.equal(await page.locator('.gallery-card').count(), 0);
  await star().click(); await ready();
  await card().click();
  await page.waitForFunction(() => !window.__holo.gallery.stats().active, null, { timeout: 120000 });
  await page.evaluate(() => window.__holo.gallery.open()); await ready();
  await shift(card()); const returnedId = await card().getAttribute('data-card-id');
  await card().click();
  await page.waitForFunction(() => !window.__holo.gallery.stats().active, null, { timeout: 120000 });
  await page.evaluate(() => window.__holo.gallery.open()); await ready();
  assert.equal(await page.locator(`[data-card-id="${returnedId}"].is-favorite`).count(), 1);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: 'all ten favorites checks, native facets, resize, viewer return', before, after }));
} catch (error) {
  await mkdir('artifacts/gallery-favorites', { recursive: true });
  await page.screenshot({ path: 'artifacts/gallery-favorites/failure.png' });
  console.log({ errors, stats: await page.evaluate(() => window.__holo?.gallery.stats()) });
  throw error;
} finally { await browser.close(); }
