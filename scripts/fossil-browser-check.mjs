import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(root)).filter(name => /^chromium-\d+$/.test(name)).sort().reverse()) {
    const candidate = join(root, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const out = join(process.cwd(), 'artifacts', 'fossil-browser');
await mkdir(out, { recursive: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && response.url().includes('127.0.0.1')) errors.push(`${response.status()} ${response.url()}`); });
// Only discovery is stubbed to keep live API outages out of this local UI test.
// Actual Fossil metadata, assets, collation, preparation and rendering run normally.
await page.route('https://api.tcgdex.net/v2/en/series', route => route.fulfill({ json: [{ id: 'base', name: 'Base' }] }));
await page.route('https://api.tcgdex.net/v2/en/series/base', route => route.fulfill({ json: { id: 'base', name: 'Base', sets: [
  { id: 'base3', name: 'Fossil' }, { id: 'base1', name: 'Base Set' }, { id: 'base2', name: 'Jungle' },
] } }));
try {
  await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  const seeds = await page.evaluate(async () => {
    const { fossilCards } = await import('/src/pokemon/FossilCatalog.ts');
    const { collatePokemon } = await import('/src/pokemon/collator.ts');
    const seeds = {};
    for (let seed = 0; seed < 100; seed++) { const variant = collatePokemon('base3', 'lapras', seed, fossilCards).pulls[10].variant; seeds[variant] ??= seed; }
    return seeds;
  });
  for (const [artwork, variant] of [['Lapras', 'holo'], ['Aerodactyl', 'normal'], ['Zapdos', 'holo']]) {
    await page.evaluate(() => window.__holo.pack.browse());
    await page.getByRole('button', { name: /Pokémon/ }).click();
    await page.getByRole('button', { name: /^Base$/ }).click();
    await page.getByRole('button', { name: /^Fossil Opening available/ }).waitFor();
    const names = await page.locator('.pokemon-pack-tile strong').allTextContents();
    assert.equal(names.indexOf('Fossil'), names.indexOf('Jungle') + 1);
    await page.getByRole('button', { name: /^Fossil Opening available/ }).click();
    await page.getByRole('button', { name: /^Lapras booster/ }).waitFor();
    assert.equal(await page.locator('button.pokemon-booster').count(), 3);
    assert.match(await page.locator('.pokemon-browser [role=status]').textContent(), /cutout pass|pending/);
    await page.screenshot({ path: join(out, `${artwork}-selection.png`) });
    await page.evaluate(seed => { const original = crypto.getRandomValues.bind(crypto); crypto.getRandomValues = array => { array[0] = seed; crypto.getRandomValues = original; return array; }; }, seeds[variant]);
    await page.getByRole('button', { name: new RegExp(`^${artwork} booster`) }).click();
    await page.waitForFunction(() => window.__holo.pack.stats().state === 'PackReady', null, { timeout: 120000 });
    const pulls = await page.evaluate(() => window.__holo.pack.stats().meshIds.map(id => {
      const card = window.__holo.scene.getObjectByProperty('uuid', id).userData.cardInstance.definition;
      return { id: card.pokemon.id, variant: card.pokemon.variant, profile: card.profile, pending: card.pokemon.treatmentStatus, maps: card.maps };
    }));
    assert.equal(pulls.length, 11); assert.equal(pulls[10].variant, variant);
    assert.ok(pulls.every(p => p.id.startsWith('base3-') && p.profile === 'print-only' && !p.maps));
    assert.equal(pulls[10].pending, variant === 'holo' ? 'deferred' : undefined);
    await page.screenshot({ path: join(out, `${artwork}-sealed.png`) });
    await page.evaluate(() => { window.__holo.pack.setStage('hit'); window.__holo.pack.tick(2); });
    await page.screenshot({ path: join(out, `${artwork}-rare.png`) });
    await page.evaluate(() => window.__holo.pack.close());
    console.log(`${artwork}: seed ${seeds[variant]}, ${pulls[10].id}, ${variant}`);
  }
  const wrappers = await page.evaluate(async () => {
    const { prepareWrapper } = await import('/src/pokemon/assets.ts');
    const { fossilSet } = await import('/src/pokemon/FossilCatalog.ts');
    return Promise.all(fossilSet.boosters.map(async booster => {
      const wrapper = await prepareWrapper(fossilSet, booster, new AbortController().signal);
      return { id: booster.id, width: wrapper.width, height: wrapper.height, printedSeals: wrapper.printedSeals };
    }));
  });
  assert.ok(wrappers.every(w => !w.printedSeals && w.width === 7.55 && w.height === 11.8));
  assert.deepEqual(errors, []);
  console.log('Wrapper framing:', wrappers);
} catch (error) {
  await page.screenshot({ path: join(out, 'failure.png') });
  console.error(error, errors); process.exitCode = 1;
} finally { await browser.close(); }
