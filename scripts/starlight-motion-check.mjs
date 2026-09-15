import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = process.env.YGO_OUT || 'artifacts/65-starlight-motion-check'; await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/jpall/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const report = [];
function shift(a, b) {
  let best = -Infinity, offset = 0;
  for (let s = -12; s <= 12; s++) {
    const pairs = a.flatMap((v, i) => i + s >= 0 && i + s < b.length ? [[v, b[i + s]]] : []);
    const ma = pairs.reduce((v, p) => v + p[0], 0) / pairs.length, mb = pairs.reduce((v, p) => v + p[1], 0) / pairs.length;
    const cross = pairs.reduce((v, p) => v + (p[0] - ma) * (p[1] - mb), 0);
    const aa = pairs.reduce((v, p) => v + (p[0] - ma) ** 2, 0), bb = pairs.reduce((v, p) => v + (p[1] - mb) ** 2, 0);
    const score = cross / Math.sqrt(aa * bb);
    if (score > best) { best = score; offset = s; }
  }
  return { offset, correlation: best };
}
async function curves(page, screenshot) {
  return page.evaluate(async data => {
    const im = new Image(); im.src = `data:image/png;base64,${data}`; await im.decode();
    const canvas = document.createElement('canvas'); canvas.width = im.width; canvas.height = im.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(im, 0, 0); const pixels = ctx.getImageData(0, 0, im.width, im.height).data;
    const h = window.__holo, d = h.cards.find(c => c.id === 'effect-veiler-ra01').dimensions, rows = [], columns = Array.from({ length: 128 }, () => []);
    const percentile = list => [...list].sort((a, b) => a - b)[Math.floor(list.length * .2)];
    for (let y = 0; y < 180; y++) {
      const row = [];
      for (let x = 0; x < 128; x++) {
        const u = .1 + .8 * x / 127, v = .1 + .8 * y / 179;
        const p = h.camera.position.clone().set((u - .5) * d.width, (.5 - v) * d.height, d.thickness / 2).applyQuaternion(h.motion.orientation).project(h.camera);
        const px = Math.round((p.x + 1) * im.width / 2), py = Math.round((1 - p.y) * im.height / 2);
        const value = pixels[(py * im.width + px) * 4]; row.push(value); columns[x].push(value);
      }
      rows.push(percentile(row));
    }
    return { x: columns.map(percentile), y: rows };
  }, screenshot.toString('base64'));
}
try {
  for (const backend of ['webgpu', 'webgl']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`); await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
    await page.evaluate(async () => { const h = window.__holo; await h.setCard('effect-veiler-ra01'); await h.setProfile('ygo-starlight'); h.hideUI(); h.pose(0, 0); });
    await page.waitForTimeout(200); await page.screenshot({ path: `${out}/${backend}-starlight.png` });
    // Inspect the exact production angular-response node on the same 3D card.
    // Removing print/sparkle for this measurement avoids mistaking a colored
    // artwork feature or projected card motion for moving reflection bands.
    await page.evaluate(async () => {
      const { MeshBasicNodeMaterial } = await import('/node_modules/.vite/deps/three_webgpu.js');
      const { vec3, vec4, uniform, cameraViewMatrix, positionView, positionViewDirection, normalViewGeometry, tangentView, tangentGeometry } = await import('/node_modules/.vite/deps/three_tsl.js');
      const { angularGrid } = await import('/src/materials/layers/AngularGridLayer.ts');
      const h = window.__holo, original = h.material(), object = h.scene.children.find(o => o.material?.[0] === original);
      const normal = normalViewGeometry, bitangent = normal.cross(tangentView).mul(tangentGeometry.w).normalize();
      const lightPosition = cameraViewMatrix.mul(vec4(uniform(h.lighting.key.position), 1)).xyz;
      const momentum = lightPosition.sub(positionView).normalize().add(positionViewDirection);
      const u = original.optics, response = angularGrid(momentum, tangentView, bitangent, normal, u.aspect, u.gridScale, u.gridTravel, u.gridWidth);
      const material = new MeshBasicNodeMaterial(); material.fragmentNode = vec4(vec3(response), 1); material.toneMapped = false;
      object.material[0] = material;
    });
    const captures = {};
    for (const [name, yaw, pitch] of [['front', 0, 0], ['up', 0, -4], ['down', 0, 4], ['right', 4, 0], ['left', -4, 0], ['up-right', 4, -4], ['returned', 0, 0]]) {
      await page.evaluate(([y, p]) => window.__holo.pose(y, p), [yaw, pitch]); await page.waitForTimeout(220);
      const screenshot = await page.screenshot(); await writeFile(`${out}/${backend}-grid-${name}.png`, screenshot);
      captures[name] = await curves(page, screenshot);
    }
    const shifts = Object.fromEntries(['up', 'down', 'right', 'left', 'up-right'].map(name => [name, { x: shift(captures.front.x, captures[name].x), y: shift(captures.front.y, captures[name].y) }]));
    console.log(backend, JSON.stringify(shifts));
    assert.ok(shifts.up.y.offset > 1 && shifts.down.y.offset < -1, 'grid moves opposite vertical tilt in card coordinates');
    assert.ok(shifts.right.x.offset < -1 && shifts.left.x.offset > 1, 'grid moves opposite horizontal tilt in card coordinates');
    assert.ok(shifts['up-right'].x.offset < -1 && shifts['up-right'].y.offset > 1, 'diagonal tilt combines both directions');
    assert.deepEqual(captures.front, captures.returned, 'fixed pose restores the same grid response');
    assert.deepEqual(errors, []); report.push({ backend, shifts, errors }); await page.close();
  }
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
} finally { await browser.close(); }
