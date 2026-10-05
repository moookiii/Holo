import { firefox } from 'playwright';
import { existsSync } from 'node:fs';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const url = process.env.GALLERY_URL || 'http://127.0.0.1:5173/?backend=webgl';
const out = join('artifacts/gallery-scroll-loading', process.env.GALLERY_RUN || 'after');
await mkdir(out, { recursive: true });
const options = { headless: true };
if (!existsSync(firefox.executablePath())) {
  for (const folder of (await readdir(join(process.env.LOCALAPPDATA, 'ms-playwright'))).filter(n => /^firefox-\d+$/.test(n)).sort().reverse()) {
    const path = join(process.env.LOCALAPPDATA, 'ms-playwright', folder, 'firefox', 'firefox.exe');
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const browser = await firefox.launch(options);
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const report = { url, errors: [], passes: [] };
page.on('pageerror', e => report.errors.push(String(e)));
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__holo?.gallery.instance()?.openingReady && document.querySelector('#loading').hidden,
    null, { timeout: 120000 });
  // Warm the current viewport only; every pass starts at the same scroll offset.
  await page.waitForFunction(() => !window.__holo.gallery.stats().pending, null, { timeout: 120000 });
  for (const name of ['cold-scroll', 'resident-return', 'persistent-scroll']) {
    if (name === 'persistent-scroll') {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForFunction(() => window.__holo?.gallery.instance()?.openingReady && document.querySelector('#loading').hidden,
        null, { timeout: 120000 });
    }
    const result = await page.evaluate(async () => {
      const h = window.__holo, g = h.gallery.instance(), el = g.viewport;
      const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
      el.scrollTop = 0; await frame(); await frame();
      const rows = [], frames = []; let last = performance.now(), sampling = true;
      const sample = now => { frames.push(now - last); last = now; if (sampling) requestAnimationFrame(sample); };
      requestAnimationFrame(sample);
      const before = h.cpuPreparation.stats();
      // Native wheel-like increments reveal partial rows. Move every 180 ms,
      // without waiting for cards, so the result includes real placeholder time.
      for (let step = 1; step <= 24; step++) {
        el.scrollTop = step * g.layout.row / 4;
        const started = performance.now(); let blankMs = 0, previous = started;
        do {
          await frame();
          const now = performance.now(), stats = g.stats();
          if (stats.visible < stats.visibleExpected) blankMs += now - previous;
          previous = now;
        } while (performance.now() - started < 180);
        rows.push({ step, blankMs, ...g.stats() });
      }
      const settled = performance.now();
      while (!g.openingReady && performance.now() - settled < 20000) await frame();
      sampling = false;
      frames.sort((a, b) => a - b);
      return { before, after: h.cpuPreparation.stats(), rows, tailReadyMs: performance.now() - settled,
        blankMs: rows.reduce((sum, row) => sum + row.blankMs, 0), frameP95: frames[Math.floor(frames.length * .95)],
        frameMax: frames.at(-1), spikes: frames.filter(ms => ms > 50).length, gallery: g.stats() };
    });
    report.passes.push({ name, ...result });
    assert.equal(result.gallery.failed, 0);
    assert.ok(result.gallery.gpuAllocatedBytes <= result.gallery.gpuBudgetBytes);
    assert.ok(result.after.previewBytes <= result.after.previewBudget);
    await page.screenshot({ path: join(out, `${name}.png`) });
    console.log(JSON.stringify({ name, blankMs: result.blankMs, tailReadyMs: result.tailReadyMs, frameP95: result.frameP95,
      avoidedDecodes: result.after.avoidedDecodes, uploads: result.gallery.uploads }));
  }
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
