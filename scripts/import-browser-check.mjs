import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const out = join(process.cwd(), 'artifacts', process.env.IMPORT_OUT || '18-import-check'), fixture = join(out, 'bundle');
await mkdir(fixture, { recursive: true });
const svg = (content, background = 'black') => `<svg xmlns="http://www.w3.org/2000/svg" width="630" height="880" viewBox="0 0 630 880"><rect width="630" height="880" fill="${background}"/>${content}</svg>`;
const rect = (x, y, width, height, fill = 'white') => `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
const files = {
  'front.svg': svg('<text x="315" y="85" text-anchor="middle" fill="#eee" font-size="35">REGISTRATION / TOP</text><path d="M210 140v610m210-610v610" stroke="#aaa" stroke-width="2"/>', '#606060'),
  'back.svg': svg('<circle cx="315" cy="440" r="160" fill="#303030"/>', '#181818'),
  'foil.svg': svg(rect(0, 0, 210, 880)),
  'secondary.svg': svg(rect(210, 0, 210, 880)),
  'stamp.svg': svg(rect(420, 0, 210, 620)),
  'metal.svg': svg(rect(420, 620, 210, 260)),
  'laminate.svg': svg('', '#444'),
  'protection.svg': svg(rect(0, 0, 630, 120)),
  'height.svg': svg('<path d="M30 400h570M30 420h570" stroke="#ddd" stroke-width="7"/>', '#808080'),
  'roughness.svg': svg(rect(0, 440, 630, 440, '#b0b0b0'), '#383838'),
  'sparkle.svg': svg('', 'white'),
  'normal.svg': svg(rect(315, 120, 315, 760, '#ad83f6'), '#8080ff'),
  'direction.svg': svg('', '#ff8055'),
  'secondary-direction.svg': svg('', '#80ff60'),
  'stamp-direction.svg': svg('', '#008050'),
  'pattern.svg': svg(rect(0, 580, 630, 300), '#333'),
  'secondary-pattern.svg': svg('', '#ccc'),
  'stamp-pattern.svg': svg('', '#eee'),
  'hologram.svg': svg(rect(0, 0, 630, 620, '#b0ff60'), '#800080'),
};
const manifest = {
  version: 1, title: 'Imported registration', franchise: 'Original', set: 'Material QA', number: '01',
  front: 'front.svg', back: 'back.svg', profile: 'master-prism',
  maps: { foil: 'foil.svg', secondaryFoil: 'secondary.svg', stamp: 'stamp.svg', metallic: 'metal.svg', laminate: 'laminate.svg', protection: 'protection.svg',
    height: 'height.svg', roughness: 'roughness.svg', sparkle: 'sparkle.svg', normal: 'normal.svg', direction: 'direction.svg', secondaryDirection: 'secondary-direction.svg', stampDirection: 'stamp-direction.svg',
    pattern: 'pattern.svg', secondaryPattern: 'secondary-pattern.svg', stampPattern: 'stamp-pattern.svg', hologram: 'hologram.svg' },
  profileOverrides: { diffraction: { strength: 1.3 }, secondaryProfile: 'aurora-silk', stampProfile: 'crystal-shard',
    secondary: { diffraction: { strength: 1.1 } }, stamp: { diffraction: { strength: 1.8 }, surface: { foilReflectance: .4 } },
    metallicInk: { color: [.83, .5, .1], roughness: .2, metalness: .9 } },
  mapSettings: { normalScale: .8, roughnessMode: 'absolute', embossStrength: .4 },
};
for (const [name, content] of Object.entries(files)) await writeFile(join(fixture, name), content);
await writeFile(join(fixture, 'card.json'), JSON.stringify(manifest, null, 2));
await writeFile(join(out, 'invalid.json'), JSON.stringify({ ...manifest, front: '../front.svg' }));

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const name of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = join(base, name, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const report = [];
async function openImport(page) {
  await page.locator('#card-toggle').click(); await page.locator('#import-card').click();
  await page.locator('dialog[open]').waitFor();
}
async function submit(page) {
  await page.locator('.import-submit').click();
  await page.waitForFunction(() => !document.querySelector('dialog[open]') || !document.querySelector('.import-error').hidden, null, { timeout: 45000 });
  assert.equal(await page.locator('.import-error').isVisible(), false, await page.locator('.import-error').textContent());
}
async function readImage(page, bytes, points) {
  return page.evaluate(async ({ data, points }) => {
    const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    return points.map(([x, y]) => [...ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data]);
  }, { data: bytes.toString('base64'), points });
}
async function difference(page, a, b) {
  return page.evaluate(async ([a, b]) => {
    const decode = async data => {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, image.width, image.height);
    };
    const [aa, bb] = await Promise.all([decode(a), decode(b)]);
    let changed = 0, left = aa.width, right = 0, top = aa.height, bottom = 0;
    for (let i = 0; i < aa.data.length; i += 4) {
      const d = Math.max(...[0, 1, 2].map(c => Math.abs(aa.data[i + c] - bb.data[i + c])));
      if (d > 4) { changed++; const x = i / 4 % aa.width, y = Math.floor(i / 4 / aa.width); left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
    }
    return { changed, left, right, top, bottom };
  }, [a.toString('base64'), b.toString('base64')]);
}
try {
  for (const backend of ['webgpu', 'webgl']) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [], external = [];
    await page.addInitScript(() => {
      window.__revoked = [];
      const revoke = URL.revokeObjectURL.bind(URL); URL.revokeObjectURL = url => { window.__revoked.push(url); revoke(url); };
    });
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith('http://127.0.0.1:5173/')) external.push(r.url()); });
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`); await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
    const builtInCards = await page.evaluate(() => window.__holo.cards.map(c => c.id));
    await page.evaluate(() => { window.__holo.setMode('rotate'); window.__holo.pose(0, 0); });
    await openImport(page);
    const before = await page.evaluate(() => window.__holo.stats().quaternion);
    await page.locator('.import-close').focus(); await page.keyboard.press('f'); await page.waitForTimeout(700);
    assert.deepEqual(await page.evaluate(() => window.__holo.stats().quaternion), before, 'modal traps viewer shortcuts');
    await page.locator('#import-front').setInputFiles(join(process.cwd(), 'public/cards/nocturne/front.svg'));
    await page.locator('#import-back').setInputFiles(join(process.cwd(), 'public/cards/nocturne/back.svg'));
    await page.locator('#import-name').fill('Local Nocturne');
    await page.screenshot({ path: join(out, `${backend}-images-dialog.png`) });
    await submit(page);
    const simple = await page.evaluate(() => { const h = window.__holo, s = h.stats(); return { ...s, definition: h.cards.find(c => c.id === s.card), foil: h.material().optics.strength.value }; });
    assert.equal(simple.definition.title, 'Local Nocturne'); assert.equal(simple.profile, 'print-only'); assert.equal(simple.foil, 0);
    await page.locator('#holo-select').selectOption('master-prism');
    await page.waitForFunction(() => window.__holo.stats().profile === 'master-prism');
    assert.equal(await page.evaluate(() => window.__holo.material().coverageTextureNode.value.image.data[0]), 255, 'unmasked image imports can switch to whole-front foil');
    assert.equal(await page.evaluate(() => window.__holo.material().optics.enabled.value), 1);
    await page.locator('#card-toggle').click(); await page.getByRole('button', { name: 'Remove Local Nocturne', exact: true }).click();
    await page.waitForFunction(() => window.__holo.stats().card === 'nocturne');
    assert.equal(await page.evaluate(id => window.__holo.cards.some(c => c.id === id), simple.card), false);
    await page.locator('#card-toggle').click();

    await openImport(page); await page.locator('#bundle-tab').click(); await page.locator('#import-bundle-files').setInputFiles(join(out, 'invalid.json'));
    await page.locator('.import-submit').click(); await page.locator('.import-error').waitFor();
    assert.match(await page.locator('.import-error').textContent(), /inside the selected bundle/);
    assert.equal(await page.evaluate(() => window.__holo.stats().card), 'nocturne');
    await page.screenshot({ path: join(out, `${backend}-invalid-bundle.png`) });
    await page.locator('.import-cancel').click();
    await openImport(page); await page.locator('#bundle-tab').click();
    // Exercise both folder selection (relative paths) and a flat selection of individual files.
    if (backend === 'webgpu') await page.locator('#import-folder').setInputFiles(fixture);
    else await page.locator('#import-bundle-files').setInputFiles((await readdir(fixture)).map(name => join(fixture, name)));
    await submit(page);
    const imported = await page.evaluate(() => {
      const h = window.__holo, m = h.material(), s = h.stats();
      return { ...s, definition: h.cards.find(c => c.id === s.card), controls: Object.fromEntries(Object.entries(m.surfaceControls).map(([k, u]) => [k, u.value])),
        layers: [m.optics, m.secondaryOptics, m.stampOptics].map(u => ({ enabled: u.enabled.value, strength: u.strength.value, fieldBlend: u.fieldBlend.value })),
        sharedStrength: h.profiles.find(p => p.id === 'master-prism').diffraction.strength };
    });
    assert.equal(imported.definition.title, manifest.title); assert.equal(imported.sharedStrength, .95);
    assert.equal(imported.controls.hasNormal, 1); assert.equal(imported.controls.hasStamp, 1); assert.equal(imported.controls.roughnessAbsolute, 1);
    assert.deepEqual(imported.layers.map(u => u.strength), [1.3, 1.1, 1.8]); assert.ok(imported.layers.every(u => u.enabled === 1 && u.fieldBlend === 1));
    await page.evaluate(() => { window.__holo.pose(0, 0); document.querySelector('#ui').style.display = 'none'; }); await page.waitForTimeout(400);
    const final = await page.screenshot({ path: join(out, `${backend}-all-maps.png`) });
    await page.evaluate(() => { const u = window.__holo.material().stampOptics; u.strength.value = 0; u.glintStrength.value = 0; u.foilReflectance.value = 0; }); await page.waitForTimeout(180);
    const stampOff = await page.screenshot({ path: join(out, `${backend}-stamp-off.png`) });
    const stampDifference = await difference(page, final, stampOff);
    assert.ok(stampDifference.changed > 1000, 'stamp has an actual optical effect');
    const bounds = await page.evaluate(() => {
      const h = window.__holo, c = h.cards.find(c => c.id === h.stats().card), p = h.camera.projectionMatrix.elements;
      const project = (x, y) => [innerWidth / 2 * (1 + x * p[0] / h.camera.position.z), innerHeight / 2 * (1 - (y - h.camera.position.y) * p[5] / h.camera.position.z)];
      return { rightThird: project(c.dimensions.width / 6, 0)[0], stampBottom: project(0, c.dimensions.height * (.5 - 620 / 880))[1],
        samples: [.25, .85].map(v => project(c.dimensions.width / 3, c.dimensions.height * (.5 - v))) };
    });
    assert.ok(stampDifference.left > bounds.rightThird - 4 && stampDifference.bottom < bounds.stampBottom + 4, 'stamp changes stay inside its printed upper-right region');
    await page.evaluate(() => { window.__holo.material().surfaceControls.hasNormal.value = 0; }); await page.waitForTimeout(180);
    const normalOff = await page.screenshot({ path: join(out, `${backend}-normal-off.png`) });
    const normalDifference = await difference(page, stampOff, normalOff); assert.ok(normalDifference.changed > 1000, 'normal map changes lighting');
    await page.evaluate(() => { window.__holo.material().surfaceControls.roughnessAbsolute.value = 0; }); await page.waitForTimeout(180);
    const roughOff = await page.screenshot({ path: join(out, `${backend}-roughness-off.png`) });
    const roughnessDifference = await difference(page, normalOff, roughOff); assert.ok(roughnessDifference.changed > 1000, 'roughness map changes reflection');
    await page.evaluate(async () => {
      const { vec3, vec4 } = await import('/node_modules/three/build/three.tsl.js'); const m = window.__holo.material();
      m.outputNode = vec4(vec3(m.surfaceTextureNode.a), 1); m.needsUpdate = true;
    }); await page.waitForTimeout(350);
    const mask = await page.screenshot({ path: join(out, `${backend}-stamp-registration.png`) });
    const registration = await readImage(page, mask, bounds.samples);
    assert.ok(registration[0][0] > 200 && registration[1][0] < 10, 'packed masks retain top/bottom registration with the source image');
    await page.evaluate(async () => {
      const { vec3, vec4 } = await import('/node_modules/three/build/three.tsl.js'); const m = window.__holo.material();
      m.outputNode = vec4(vec3(m.hologramTextureNode.g), 1); m.needsUpdate = true;
    }); await page.waitForTimeout(200);
    const imageWindow = await readImage(page, await page.screenshot(), bounds.samples);
    assert.ok(imageWindow[0][0] > 200 && imageWindow[1][0] < 10, 'image window retains top/bottom registration after worker packing');
    await page.evaluate(async () => { const h = window.__holo; await h.setCard(h.stats().card); document.querySelector('#ui').style.display = ''; h.pose(-15, 0); });
    await page.setViewportSize({ width: 320, height: 568 }); await openImport(page); await page.screenshot({ path: join(out, `${backend}-mobile-dialog.png`) });
    const dialog = await page.locator('dialog').boundingBox();
    assert.ok(dialog.x >= 0 && dialog.x + dialog.width <= 320 && dialog.height <= 568, 'import dialog fits narrow viewports');
    assert.equal(await page.locator('dialog').evaluate(el => el.scrollWidth > el.clientWidth), false, 'dialog has no horizontal overflow');
    const submitBounds = await page.locator('.import-submit').boundingBox();
    assert.ok(submitBounds.y >= dialog.y && submitBounds.y + submitBounds.height <= dialog.y + dialog.height, 'import actions stay visible while the form scrolls');
    await page.locator('.import-cancel').click(); await page.setViewportSize({ width: 1200, height: 1000 });
    await page.locator('#card-toggle').click(); await page.getByRole('button', { name: `Remove ${manifest.title}`, exact: true }).click();
    await page.waitForFunction(() => window.__holo.stats().card === 'nocturne');
    const cleanup = await page.evaluate(() => ({ cards: window.__holo.cards.map(c => c.id), revoked: window.__revoked, controls: window.__holo.material().surfaceControls.hasStamp.value }));
    assert.deepEqual(cleanup.cards, builtInCards, 'removing imports preserves every built-in card'); assert.equal(cleanup.controls, 0);
    for (const url of [imported.definition.front, imported.definition.back, ...Object.values(imported.definition.maps)]) assert.ok(cleanup.revoked.includes(url), 'import image URL released');
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    report.push({ backend, passed: true, stampDifference, normalDifference, roughnessDifference, registration, revokedURLs: cleanup.revoked.length, errors, external });
    await page.close();
  }
} catch (error) {
  for (const [i, page] of browser.contexts().flatMap(c => c.pages()).entries()) await page.screenshot({ path: join(out, `failure-${i}.png`) });
  throw error;
} finally { await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
console.log(JSON.stringify(report, null, 2));
