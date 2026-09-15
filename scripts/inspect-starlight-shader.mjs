import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: 'C:/Users/jpall/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto('http://127.0.0.1:5173/'); await page.waitForFunction(() => window.__holo?.ready);
  await page.evaluate(async () => { const h = window.__holo; await h.setCard('effect-veiler-ra01'); await h.setProfile('ygo-starlight'); h.hideUI(); h.pose(0, 0); });
  const shader = await page.evaluate(async () => {
    const h = window.__holo, object = h.scene.children.find(o => o.material?.[0] === h.material());
    const copy = object.clone(); copy.material = h.material();
    return await h.renderer.debug.getShaderAsync(h.scene, h.camera, copy);
  });
  console.log(Object.keys(shader));
  await writeFile('artifacts/62-starlight-angular-grid/shader.json', JSON.stringify(shader, null, 2));
  await page.evaluate(() => { window.__holo.material().optics.gridStrength.value = 0; });
  await page.waitForTimeout(300); await page.screenshot({ path: 'artifacts/62-starlight-angular-grid/disabled.png' });
} finally { await browser.close(); }
