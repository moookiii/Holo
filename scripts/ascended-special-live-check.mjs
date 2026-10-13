import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

let executablePath = chromium.executablePath();
if (!existsSync(executablePath)) {
  for (const version of (await readdir(join(process.env.LOCALAPPDATA, 'ms-playwright'))).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = join(process.env.LOCALAPPDATA, 'ms-playwright', version, 'chrome-win64/chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const out = 'artifacts/ascended-integration/live';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
const errors = [], requests = new Set(), cards = [], report = { cards, errors };
page.on('pageerror', error => { errors.push(error.message); console.log('PAGE ERROR', error.message); });
page.on('request', request => requests.add(new URL(request.url()).pathname));
page.on('response', response => { if (response.status() >= 400 && response.url().includes('127.0.0.1')) errors.push(`${response.status()} ${response.url()}`); });
page.on('console', message => { if (message.type() === 'error') console.log('CONSOLE', message.text().slice(0, 400)); });
try {
  // Freeze the asset revision for this immutable capture run. Concurrent
  // unrelated asset authoring must not repeatedly scan the whole dev tree.
  await page.route('**/__holo-cache-revision', route => route.fulfill({ contentType: 'text/plain', body: 'ascended-native-live-v1' }));
  await page.routeWebSocket('**', socket => socket.close());
  await page.goto(process.env.HOLO_URL || 'http://127.0.0.1:5176/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 180000 });
  console.log('Application ready');
  for (const number of [25, 1, 8, 11, 18, 108, 123, 140]) {
    const id = `pokemon:me02.5-${String(number).padStart(3, '0')}:special-reverse`;
    await page.evaluate(id => Promise.race([window.__holo.setCard(id),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Viewer preparation timed out: ' + id)), 120000))]), id);
    await page.waitForFunction(id => window.__holo.stats().card === id, id, { timeout: 120000 });
    const definition = await page.evaluate(id => {
      const h = window.__holo, c = h.cards.find(c => c.id === id), material = h.material();
      return { id, profile: c.profile, number: c.number, maps: c.maps,
        native: material.optics.tcglFlatSilver, fragment: !!material.fragmentNode,
        whiteplate: [material.foilControlsTextureNode.value.image.width, material.foilControlsTextureNode.value.image.height],
        stats: h.stats() };
    }, id);
    assert.equal(definition.profile, 'ascended-special-reverse');
    assert.equal(definition.native, true);
    assert.equal(definition.fragment, true);
    assert.deepEqual(definition.whiteplate, [512, 512]);
    await page.evaluate(() => { window.__holo.hideUI(); window.__holo.zoom(.85); });
    for (const [name, yaw, pitch] of [['front', 0, 0], ['tilt', 24, -12], ['grazing', -48, 18]]) {
      await page.evaluate(([yaw, pitch]) => { window.__holo.lighting.setPreset('Studio'); window.__holo.pose(yaw, pitch, 0); }, [yaw, pitch]);
      await page.waitForTimeout(450);
      await page.screenshot({ path: `${out}/${number}-${name}.png` });
    }
    if (number === 25) {
      await page.evaluate(() => window.__holo.pose(0, 0, 0));
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/25-animation-a.png` });
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${out}/25-animation-b.png` });
    }
    cards.push(definition);
    console.log('Verified native viewer', number);
  }
  await page.evaluate(() => window.__holo.gallery.open());
  await page.waitForFunction(() => window.__holo.gallery.stats()?.active, null, { timeout: 120000 });
  await page.getByRole('combobox', { name: 'Set', exact: true }).selectOption('Ascended Heroes');
  await page.getByRole('combobox', { name: 'Finish', exact: true }).selectOption('special-reverse');
  await page.waitForFunction(() => {
    const s = window.__holo.gallery.stats();
    return s.filtered === 140 && s.visible > 0 && s.visibleFailed === 0 && s.activeVisibleLoads === 0;
  }, null, { timeout: 180000 });
  await page.screenshot({ path: `${out}/gallery-140.png` });
  report.gallery = await page.evaluate(() => window.__holo.gallery.stats());
  for (const search of ['Entei', 'Team Rocket']) {
    await page.getByRole('searchbox', { name: 'Search gallery cards' }).fill(search);
    await page.waitForFunction(() => {
      const s = window.__holo.gallery.stats(); return s.visible > 0 && s.activeVisibleLoads === 0 && s.visibleFailed === 0;
    }, null, { timeout: 120000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/gallery-${search.replaceAll(' ', '-')}.png` });
  }
  await page.evaluate(() => window.__holo.gallery.close('pokemon:me02.5-025:special-reverse'));
  // Use the real retail collator and the same CPU preparation/opening APIs as
  // the pack browser. Find a deterministic pack whose assigned ph2 is Entei.
  report.pack = await page.evaluate(async () => {
    const [{ collatePokemon }, { svTcglCards, svTcglSet }, { pokemonDefinition }, { prepareWrapper }, { prepareExactPack }] = await Promise.all([
      import('/src/pokemon/collator.ts'), import('/src/pokemon/SvTcglCatalog.ts'), import('/src/pokemon/materials.ts'),
      import('/src/pokemon/assets.ts'), import('/src/pack/PreparedPack.ts'),
    ]);
    const set = svTcglSet('me02.5'), booster = set.boosters[0], h = window.__holo;
    let seed = 0, resolved;
    for (; seed < 10000; seed++) {
      resolved = collatePokemon(set.id, booster.id, seed, svTcglCards);
      if (resolved.pulls.some(p => p.card.id === 'me02.5-025' && p.variant === 'special-reverse')) break;
    }
    if (seed === 10000) throw new Error('No deterministic Entei ph2 seed found');
    const definitions = resolved.pulls.map(p => pokemonDefinition(p.card, p.variant, h.cards, set.id));
    const signal = new AbortController().signal, wrapper = await prepareWrapper(set, booster, signal);
    const definition = { id: `pokemon:${set.id}:${booster.id}`, name: set.name, category: 'Pokémon', seed,
      cardCount: resolved.pulls.length, order: 'fixed', wrapper, pokemon: resolved,
      contents: definitions.map(c => ({ cardId: c.id, rarity: c.pokemon.variant === 'normal' ? 'standard' : 'foil' })) };
    const prepared = await prepareExactPack(definition, seed, definitions, signal, (c, s) => h.cpuPreparation.prepare(c, s));
    await h.pack.open(definition.id, prepared);
    return { seed, cards: definitions.map(c => ({ id: c.id, profile: c.profile, maps: c.maps })), stats: h.stats(), pack: h.pack.stats() };
  });
  assert.equal(report.pack.cards.length, 11);
  assert.ok(report.pack.cards.some(c => c.id === 'pokemon:me02.5-025:special-reverse' && c.profile === 'ascended-special-reverse'));
  assert.equal(report.pack.stats.packMetrics.usedCpuPreparation, true);
  await page.evaluate(() => { window.__holo.pack.setStage('summary'); window.__holo.pack.tick(3); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/pack-summary.png` });
  console.log('Verified real Entei special reverse pack', report.pack.seed);
  report.nativeRequests = [...requests].filter(path => path.includes('tcgl-ascended-original'));
  assert.equal(report.nativeRequests.filter(path => path.endsWith('T_Holofoil_Mask_Bar_Wide_Single.png')).length, 1);
  assert.equal(report.nativeRequests.filter(path => path.endsWith('FX_T_Spectrum_FlatSilver.png')).length, 1);
  assert.deepEqual(errors, []);
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
