import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true,
  args: ['--enable-unsafe-webgpu', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

const waitState = state => page.waitForFunction(expected => window.__holo?.pack.stats().state === expected, state, { timeout: 90000 });
const audioStats = () => page.evaluate(() => window.__holo.pack.audio.stats());
const tick = (seconds = 2) => page.evaluate(value => window.__holo.pack.tick(value), seconds);

try {
  await page.goto(process.env.HOLO_URL ?? 'http://127.0.0.1:5174/');
  await page.waitForFunction(() => window.__holo?.ready, undefined, { timeout: 90000 });
  await page.evaluate(() => { void window.__holo.pack.open('test-pack'); });
  await waitState('PackIntro');
  await tick(); await waitState('PackReady');

  // Buttons are genuine user gestures, exercising the same autoplay-unlock path as production.
  await page.locator('.pack-action').click();
  await tick();
  await waitState('OpenWrapper');
  let audio = await audioStats();
  assert.equal(audio.contextState, 'running');
  assert.equal(audio.playCounts.tearStart, 1);
  assert.equal(audio.playCounts.tearFinish, 1);
  assert.equal(audio.playCounts.stripRelease, 1);
  assert.ok(audio.playCounts.crinkle > 0 && audio.playCounts.crinkle < 12, 'automatic tear crinkles are throttled');

  await page.locator('.pack-action').click();
  await tick();
  await waitState('ExtractStack');
  await page.locator('.pack-action').click();
  await tick(3);
  await waitState('RevealCard');
  audio = await audioStats();
  assert.equal(audio.playCounts.extract, 1);

  await page.locator('.pack-action').click();
  await tick();
  await page.waitForFunction(() => window.__holo.pack.stats().revealed, undefined, { timeout: 30000 });
  audio = await audioStats();
  assert.equal(audio.playCounts.cardSlide, 1);
  assert.equal(audio.playCounts.cardSettle, 0, 'reveal completion does not settle the card');
  await page.locator('.pack-action').click();
  await tick();
  audio = await audioStats();
  assert.equal(audio.playCounts.cardSettle, 1, 'the outgoing card settles after crossing offscreen');

  await page.locator('.pack-back').click();
  await page.evaluate(() => { void window.__holo.pack.open('test-pack'); });
  await waitState('PackIntro');
  assert.equal((await audioStats()).prepared, true);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, audio }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ state: await page.evaluate(() => window.__holo?.pack.stats()), errors }, null, 2));
  throw error;
} finally {
  await browser.close();
}
