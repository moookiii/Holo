import { chromium, firefox } from 'playwright';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const name = process.env.GALLERY_BROWSER || 'chromium';
const engine = name === 'firefox' ? firefox : chromium;
const out = join(process.cwd(), 'artifacts', `gallery-tilt-${name}`);
await mkdir(out, { recursive: true });
const options = { headless: true, ...(name === 'chromium' ? { args: ['--ignore-gpu-blocklist'] } : {}) };
if (!existsSync(engine.executablePath())) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => n.startsWith(`${name}-`)).sort().reverse()) {
    const path = join(base, version, ...(name === 'firefox' ? ['firefox', 'firefox.exe'] : ['chrome-win64', 'chrome.exe']));
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const browser = await engine.launch(options);
const page = await browser.newPage({ viewport: { width: 2026, height: 1062 }, deviceScaleFactor: 1 });
const report = { errors: [], samples: [] };
page.on('pageerror', error => report.errors.push(String(error)));
try {
  await page.goto('http://127.0.0.1:5173/?backend=webgl', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  await page.getByRole('button', { name: 'Gallery', exact: true }).click();
  await page.getByRole('combobox', { name: 'Set', exact: true }).selectOption('Jungle');
  await page.getByRole('combobox', { name: 'Finish', exact: true }).selectOption('holo');
  await page.locator('.gallery-tools summary').click();
  await page.waitForFunction(() => window.__holo.gallery.stats().visible >= 12, null, { timeout: 120000 });
  // Outer-column cards, pitched away from a pointer above/below their center,
  // exposed pow(0, 0) in absent foil layers. A center-only hover misses this.
  for (const [label, x, y] of [['left', 200, 850], ['right', 1800, 520], ['upper-left', 300, 500], ['neutral', 5, 5]]) {
    await page.mouse.move(x, y); await page.waitForTimeout(1800);
    const screenshot = await page.screenshot({ path: join(out, `${label}.png`) });
    const painted = await page.evaluate(async encoded => {
      const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      return [...document.querySelectorAll('.gallery-card.is-ready')].flatMap(card => {
        const rect = card.getBoundingClientRect(), height = parseFloat(card.style.getPropertyValue('--card-height'));
        if (rect.top < 105 || rect.top + height > image.height) return [];
        // The pale lower print should remain intact regardless of foil lighting.
        const pixels = ctx.getImageData(Math.round(rect.left + rect.width * .2), Math.round(rect.top + height * .6),
          Math.round(rect.width * .6), Math.round(height * .25)).data;
        let lit = 0;
        for (let i = 0; i < pixels.length; i += 4) if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 35) lit++;
        return [{ card: card.getAttribute('aria-label'), fraction: lit / (pixels.length / 4) }];
      });
    }, screenshot.toString('base64'));
    report.samples.push({ label, painted });
    assert.ok(painted.length >= 12, 'Expected both complete rows');
    assert.ok(painted.every(sample => sample.fraction > .9), `${label}: missing printed card area: ${JSON.stringify(painted)}`);
  }
  assert.equal(await page.evaluate(() => window.__holo.gallery.stats().tilted), 0);
  assert.deepEqual(report.errors, []);
  console.log(`${name}: all tilt positions preserve printed artwork; neutral return passed`);
} catch (error) {
  report.failure = String(error); process.exitCode = 1; console.error(error);
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
