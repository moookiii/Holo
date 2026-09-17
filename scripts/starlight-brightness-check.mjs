import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = 'artifacts/81-starlight-light-response';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/jpall/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const report = [];
try {
  for (const backend of ['webgpu', 'webgl']) {
    const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
    await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
    await page.evaluate(async () => { const h = window.__holo; await h.setCard('holo-yugioh-top-pot-of-sloth'); h.hideUI(); });
    for (const [pose, yaw, pitch] of [['catch', -15, -12], ['front', 0, 0], ['opposite', 15, 10]]) {
      await page.evaluate(([y, p]) => window.__holo.pose(y, p), [yaw, pitch]);
      const gains = [];
      for (const key of [25, 130, 260]) {
        const captures = [];
        for (const enabled of [true, false]) {
          await page.evaluate(async ([key, enabled]) => {
            const h = window.__holo; await h.setProfile('ygo-starlight'); h.lighting.setPreset('Studio'); h.lighting.key.intensity = key;
            if (!enabled) { const u = h.material().optics; u.strength.value = 0; u.glintStrength.value = 0; u.patternedSilver.value = 0; u.foilReflectance.value = 0; }
          }, [key, enabled]);
          await page.waitForTimeout(250);
          captures.push((await page.screenshot({ path: `${out}/${backend}-${pose}-${key}-${enabled ? 'foil' : 'print'}.png` })).toString('base64'));
        }
        const gain = await page.evaluate(async captures => {
          const images = await Promise.all(captures.map(async data => { const im = new Image(); im.src = `data:image/png;base64,${data}`; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0); return ctx.getImageData(0, 0, c.width, c.height).data; }));
          let total = 0, lit = 0;
          for (let i = 0; i < images[0].length; i += 4) { const delta = Math.max(...[0, 1, 2].map(c => images[0][i+c] - images[1][i+c])); total += Math.max(0, delta); if (delta > 12) lit++; }
          return { total, lit };
        }, captures);
        gains.push({ key, ...gain });
      }
      console.log(backend, pose, gains);
      // The opposite pose mainly catches the unchanged strip, so only require
      // monotonic growth there; the key-facing pose must show a strong flare.
      assert.ok(gains[1].total > gains[0].total * (pose === 'catch' ? 1.2 : 1.02), 'More incident light must brighten the foil contribution');
      assert.ok(gains[2].total > gains[1].total * (pose === 'catch' ? 1.1 : 1.02), 'Strong light must keep increasing foil brightness');
      report.push({ backend, pose, gains, errors });
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
