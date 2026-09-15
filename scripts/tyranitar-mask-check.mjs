import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const out = join(process.cwd(), 'artifacts', process.env.TYRANITAR_MASK_OUT || '119-tyranitar-mask-registration');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/cards/tyranitar-paldea-evolved/foil.svg');
  const result = await page.evaluate(async () => {
    const load = async name => { const im = new Image(); im.src = `/cards/tyranitar-paldea-evolved/${name}`; await im.decode(); return im; };
    const canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas'); canvas.width = 734; canvas.height = 1021;
    const ctx = canvas.getContext('2d');
    const maps = {};
    for (const name of ['foil', 'extended-foil', 'laminate']) {
      ctx.drawImage(await load(`${name}.svg`), 0, 0, 734, 1021);
      maps[name] = ctx.getImageData(0, 0, 734, 1021);
    }
    const range = (name, bounds) => {
      let min = 255, max = 0;
      for (let y = bounds[1]; y < bounds[3]; y++) for (let x = bounds[0]; x < bounds[2]; x++) {
        const n = maps[name].data[(y * 734 + x) * 4]; min = Math.min(min, n); max = Math.max(max, n);
      }
      return { min, max };
    };
    const checks = {};
    for (const name of ['foil', 'extended-foil']) checks[name] = {
      leftTealRail: range(name, [31, 205, 56, 475]),
      topRightBackground: range(name, [548, 104, 672, 114]),
      rightBackground: range(name, [630, 118, 673, 200]),
      evolutionStrip: range(name, [143, 98, 480, 113]),
      subjectTorso: range(name, [360, 250, 460, 350]),
    };
    ctx.drawImage(await load('front.png'), 0, 0);
    // Green indicates the actual primary foil coverage, over the unmodified print.
    const overlay = ctx.getImageData(0, 0, 734, 1021);
    for (let i = 0; i < overlay.data.length; i += 4) {
      const alpha = maps.foil.data[i] / 255 * .60;
      for (let c = 0; c < 3; c++) overlay.data[i + c] = overlay.data[i + c] * (1 - alpha) + [0, 255, 90][c] * alpha;
    }
    ctx.putImageData(overlay, 0, 0);
    return { checks, laminateRail: range('laminate', [31, 205, 56, 475]), overlay: canvas.toDataURL('image/png').split(',')[1] };
  });
  await writeFile(join(out, 'coverage-overlay.png'), Buffer.from(result.overlay, 'base64'));
  delete result.overlay;
  await writeFile(join(out, 'report.json'), JSON.stringify({ ...result, errors }, null, 2));
  for (const [name, checks] of Object.entries(result.checks)) {
    assert.equal(checks.leftTealRail.max, 0, `${name}: foil spills onto left teal rail`);
    assert.equal(checks.topRightBackground.min, 184, `${name}: missing raised upper-right artwork coverage`);
    assert.equal(checks.rightBackground.min, 184, `${name}: missing upper-right background coverage`);
    assert.equal(checks.evolutionStrip.max, 0, `${name}: evolution strip must remain opaque print`);
    assert.equal(checks.subjectTorso.max, 0, `${name}: subject ink must remain protected`);
  }
  assert.equal(result.laminateRail.min, 119);
  assert.equal(result.laminateRail.max, 119, 'artwork laminate must not spill onto the left rail');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ...result, errors }, null, 2));
} finally { await browser.close(); }
