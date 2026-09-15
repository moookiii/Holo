import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const out = 'artifacts/71-blue-eyes-optics'; await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/jpall/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForFunction(() => window.__holo?.ready);
  await page.evaluate(async () => { await window.__holo.setCard('blue-eyes'); window.__holo.hideUI(); });
  const variants = [
    ['restrained', { metalness: .22, roughness: .36, foilReflectance: .02, laminate: .10, laminateRoughness: .4, period: 1.15, bandwidth: .026, strength: 1.1, angle: 1.35, crossWidth: .22 }],
    ['narrow', { metalness: .28, roughness: .32, foilReflectance: .035, laminate: .10, laminateRoughness: .4, period: 1.25, bandwidth: .02, strength: 1.25, angle: -.45, crossWidth: .28 }],
    ['silver', { metalness: .38, roughness: .3, foilReflectance: .04, laminate: .12, laminateRoughness: .35, period: 1.05, bandwidth: .023, strength: .75, angle: .9, crossWidth: .3 }],
  ];
  for (const [name, values] of variants) {
    await page.evaluate(values => { const u = window.__holo.material().optics; for (const [key, value] of Object.entries(values)) u[key].value = value; }, values);
    for (const [pose, yaw, pitch] of [['front',0,0],['tilt',12,-8],['opposite',-12,8],['reflection',-15,-15]]) {
      await page.evaluate(([y,p]) => window.__holo.pose(y,p), [yaw,pitch]); await page.waitForTimeout(180);
      await page.screenshot({ path: `${out}/${name}-${pose}.png` });
    }
  }
  await writeFile(`${out}/report.json`, JSON.stringify({ variants, errors },null,2));
} finally { await browser.close(); }
