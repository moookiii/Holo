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
const out = join(process.cwd(), 'artifacts', 'base-set-browser');
await mkdir(out, { recursive: true });
const errors = [];
// The live TCGdex service intermittently omits or duplicates CORS headers.
// Keep the real response bodies while making this UI integration check stable.
await page.route(/^https:\/\/(api|assets)\.tcgdex\.net\//, async route => {
  const response = await route.fetch();
  await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': '*' } });
});
page.on('pageerror', error => errors.push(error.message));
page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`${request.url()}: ${request.failure()?.errorText}`); });
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
try {
  await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 30000 });
  for (const [kind, seed, artwork, expected] of [
    ['normal', 0, 'Blastoise', 'normal'],
    ['holo', 4, 'Venusaur', 'holo'],
    ['charizard', 40, 'Charizard', 'base1-4'],
  ]) {
    await page.getByRole('button', { name: 'Open a pack' }).click();
    await page.getByRole('button', { name: /Pokémon/ }).click();
    await page.getByRole('button', { name: /^Base$/ }).click();
    const baseSet = page.getByRole('button', { name: /^Base Set Opening available$/ });
    await baseSet.waitFor({ timeout: 120000 });
    assert.match(await baseSet.textContent(), /Opening available/);
    await baseSet.click();
    await page.getByRole('button', { name: /Blastoise booster/ }).waitFor({ timeout: 120000 });
    assert.equal(await page.locator('button.pokemon-booster').count(), 3);
    assert.equal(await page.locator('button.pokemon-booster img[src*="base1-"]').count(), 3);
    await page.evaluate(seed => { const original = crypto.getRandomValues.bind(crypto); crypto.getRandomValues = array => { array[0] = seed; crypto.getRandomValues = original; return array; }; }, seed);
    await page.getByRole('button', { name: `${artwork} booster` }).click();
    await page.waitForFunction(() => window.__holo.pack.stats().state === 'PackReady', null, { timeout: 180000 });
    const pulls = await page.evaluate(() => window.__holo.pack.stats().meshIds.map(id => {
      const card = window.__holo.scene.getObjectByProperty('uuid', id).userData.cardInstance.definition;
      return { id: card.pokemon?.id, variant: card.pokemon?.variant, profile: card.profile };
    }));
    assert.equal(pulls.length, 11);
    assert.ok(pulls.every(p => p.id?.startsWith('base1-')));
    assert.ok(pulls.every(p => p.variant !== 'reverse'));
    assert.equal(expected === 'base1-4' ? pulls.at(-1).id : pulls.at(-1).variant, expected);
    await page.screenshot({ path: join(out, `${kind}-sealed.png`) });
    await page.evaluate(() => window.__holo.pack.close());
    console.log(`${kind}: seed ${seed}, ${pulls.at(-1).id}, ${pulls.at(-1).variant}`);
  }
  // TCGdex advertises a logo for the unrelated Base-series promo catalog that
  // currently 404s; the browser's tile fallback handles it.
  assert.deepEqual(errors.filter(error => !error.includes('/basep/logo.webp') && !error.includes('Failed to load resource: the server responded with a status of 404')), []);
} catch (error) {
  await page.screenshot({ path: join(out, 'failure.png') });
  console.error(error);
  console.error('Page:', await page.title(), await page.locator('body').innerText().catch(() => 'unavailable'));
  console.error('Errors:', errors);
  process.exitCode = 1;
} finally { await browser.close(); }
