import { chromium } from 'playwright';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const out = join(process.cwd(), 'artifacts', process.env.GALLERY_OUTPUT || 'gallery-holo'); await mkdir(out, { recursive: true });
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
const errors = [], assetWarnings = [], report = { errors, assetWarnings, visibility: [] };
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => {
  if (message.type() !== 'error') return;
  const text = message.text();
  // TCGdex's known duplicate CORS header exercises the existing local fallback.
  if (text.includes('assets.tcgdex.net') || text === 'Failed to load resource: net::ERR_FAILED') assetWarnings.push(text);
  else errors.push(text);
});
try {
  await page.goto(`http://127.0.0.1:5173/${process.env.GALLERY_QUERY || ''}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  await page.evaluate(() => window.__holo.gallery.open());
  await page.getByRole('combobox', { name: 'Set', exact: true }).selectOption('Jungle');
  await page.getByRole('combobox', { name: 'Finish', exact: true }).selectOption('holo');
  await page.waitForFunction(() => window.__holo.gallery.stats()?.visible >= 12, null, {timeout: 120000});
  for (const light of ['Studio', 'Moving light', 'Blacklight']) {
    await page.evaluate(light => window.__holo.lighting.setPreset(light), light);
    await page.mouse.move(690, 520); await page.waitForTimeout(1800);
    const screenshot = await page.screenshot({path: join(out, `${light}.png`)});
    // Shader NaNs can leave an apparently healthy scene with invisible cards.
    // Check actual rendered artwork, independently of residency counters.
    const painted = await page.evaluate(async encoded => {
      const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      return [...document.querySelectorAll('.gallery-card.is-ready')].map(card => {
        const rect = card.getBoundingClientRect();
        if (rect.top < 175 || rect.top + 120 > image.height) return null;
        const pixels = ctx.getImageData(Math.round(rect.left + rect.width * .25), Math.round(rect.top + 40), Math.round(rect.width * .5), 80).data;
        let lit = 0;
        for (let i = 0; i < pixels.length; i += 4) if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 35) lit++;
        return lit / (pixels.length / 4);
      }).filter(value => value !== null);
    }, screenshot.toString('base64'));
    report.visibility.push({ light, painted });
    assert.ok(painted.length >= 6, 'Expected several visible card samples');
    assert.ok(painted.every(fraction => fraction > .25), `${light}: missing artwork: ${painted}`);
  }
  report.stats = await page.evaluate(() => ({gallery: window.__holo.gallery.stats(), memory: window.__holo.renderer.info.memory, frameMs: window.__holo.stats().frameMs}));
  console.log(JSON.stringify(report));
  assert.equal(errors.length,0,errors.join('\n'));
} catch(error) { report.failure = String(error); console.error(error); console.log(JSON.stringify(errors)); process.exitCode=1; await page.screenshot({path:join(out,'failure.png')}); }
finally { await writeFile(join(out,'report.json'), JSON.stringify(report,null,2)); await browser.close(); }
