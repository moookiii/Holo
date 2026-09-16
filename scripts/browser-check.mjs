import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) for (const v of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
  const candidate = join(base, v, 'chrome-win64', 'chrome.exe');
  if (existsSync(candidate)) { executablePath = candidate; break; }
}
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const out = join(process.cwd(), 'artifacts', 'browser-check'); await mkdir(out, { recursive: true });
const previewUrl = process.env.HOLO_URL || 'http://127.0.0.1:5173';
const report = [];
async function stationaryDifference(page, a, b) {
  if (a.equals(b)) return { changed: 0, max: 0, over1: 0 };
  return page.evaluate(async ([a, b]) => {
    const decode = async data => {
      const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0); return ctx.getImageData(0, 0, img.width, img.height).data;
    };
    const [aa, bb] = await Promise.all([decode(a), decode(b)]);
    let changed = 0, max = 0, over1 = 0;
    for (let i = 0; i < aa.length; i += 4) {
      const d = Math.max(Math.abs(aa[i] - bb[i]), Math.abs(aa[i + 1] - bb[i + 1]), Math.abs(aa[i + 2] - bb[i + 2]));
      if (d) changed++; if (d > 1) over1++; max = Math.max(max, d);
    }
    return { changed, max, over1 };
  }, [a.toString('base64'), b.toString('base64')]);
}
try {
  for (const backend of ['webgpu', 'webgl']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${previewUrl}/?backend=${backend}`);
    await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
    assert.equal(await page.evaluate(() => window.__holo.lighting.key.type), 'RectAreaLight', 'preview runs the current softbox lighting implementation');
    assert.deepEqual(await page.evaluate(() => window.__holo.stats().quaternion), [0, 0, 0, 1], 'Combined interaction starts face-on');
    const offered = await page.locator('#holo-select option:not([hidden])').evaluateAll(options => options.map(o => o.value));
    assert.ok(['master-prism', 'microdiamond', 'starfield', 'pokemon-cosmos', 'pokemon-galaxy-star', 'opal', 'solar-fresnel', 'liquid-spectrum', 'cathedral-prism', 'spectral-lattice', 'black-chrome-prism'].every(id => offered.includes(id)), 'new and established treatments remain available across cards');
    assert.equal(await page.locator('#mode-toggle').count(), 0, 'separate interaction mode picker is removed');
    assert.equal((await page.evaluate(() => window.__holo.stats())).mode, 'combined');
    await page.evaluate(() => { window.__holo.pose(38, -21, 32); window.__holo.flip(); });
    await page.waitForTimeout(700); await page.mouse.move(720, 500); await page.evaluate(() => window.__holo.reset()); await page.waitForTimeout(800);
    assert.ok(Math.abs((await page.evaluate(() => window.__holo.stats().quaternion))[3]) > .999999, 'Reset returns the front straight toward the camera (q and -q are equivalent)');
    await page.evaluate(() => window.__holo.pose(0, 0));
    await page.mouse.move(1300, 500); await page.waitForTimeout(1100);
    const rightTilt = await page.evaluate(() => window.__holo.motion.hover.toArray());
    assert.ok(rightTilt[1] > .2, 'moving right recedes the right edge');
    await page.screenshot({ path: join(out, `${backend}-tilt-right.png`) });
    await page.mouse.move(720, 900); await page.waitForTimeout(1100);
    const downTilt = await page.evaluate(() => window.__holo.motion.hover.toArray());
    assert.ok(downTilt[0] > .18, 'moving down recedes the bottom edge');
    await page.screenshot({ path: join(out, `${backend}-tilt-down.png`) });
    const beforeDrag = await page.evaluate(() => window.__holo.motion.manual.toArray());
    await page.mouse.move(720, 500); await page.mouse.down(); await page.mouse.move(930, 590, { steps: 8 }); await page.mouse.up();
    const afterDrag = await page.evaluate(() => window.__holo.motion.manual.toArray());
    assert.ok(beforeDrag.some((value, index) => Math.abs(value - afterDrag[index]) > 1e-3), 'drag rotation works in the same interaction as pointer-follow tilt');
    await page.evaluate(() => { window.__holo.setMode('rotate'); window.__holo.pose(-7, 4); });
    await page.evaluate(() => window.__holo.hideUI());
    await page.waitForTimeout(700);
    const initial = await page.evaluate(() => window.__holo.stats());
    assert.equal(initial.backend, backend === 'webgpu' ? 'WebGPUBackend' : 'WebGLBackend');
    await page.keyboard.press('f'); await page.waitForTimeout(800);
    await page.screenshot({ path: join(out, `${backend}-back.png`) });
    await page.keyboard.press('f'); await page.waitForTimeout(800);
    const flipped = await page.evaluate(() => window.__holo.stats());
    const dot = initial.quaternion.reduce((s, n, i) => s + n * flipped.quaternion[i], 0);
    assert.ok(Math.abs(dot) > 0.999999, 'double physical flip preserves orientation');
    const stillA = await page.screenshot(); await page.waitForTimeout(400); const stillB = await page.screenshot();
    const stationary = await stationaryDifference(page, stillA, stillB);
    if (stationary.over1 || stationary.changed > 50) {
      await writeFile(join(out, `${backend}-still-a.png`), stillA); await writeFile(join(out, `${backend}-still-b.png`), stillB);
      console.log('stationary mismatch', backend, await page.evaluate(() => ({ stats: window.__holo.stats(), hover: window.__holo.motion.hover.toArray(), velocity: window.__holo.motion.velocity.toArray() })));
    }
    // GPU readback can round a handful of channels by one 8-bit level. Any larger
    // difference or broad change remains a failure; animated noise cannot pass.
    assert.ok(stationary.over1 === 0 && stationary.changed <= 50, 'stationary foil is temporally stable');
    await page.mouse.move(640, 430); await page.mouse.down(); await page.mouse.move(770, 490, { steps: 15 }); await page.mouse.up();
    await page.waitForTimeout(700);
    const dragged = await page.evaluate(() => window.__holo.stats());
    assert.notDeepEqual(dragged.quaternion, initial.quaternion);
    await page.mouse.wheel(0, -190); await page.waitForTimeout(650);
    assert.ok((await page.evaluate(() => window.__holo.stats())).zoom < 0.9);
    await page.screenshot({ path: join(out, `${backend}-dragged-close.png`) });
    await page.evaluate(() => { window.__holo.pose(-15, 0); window.__holo.zoom(1); });
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(250);
    await page.screenshot({ path: join(out, `${backend}-portrait.png`) });
    await page.evaluate(() => window.__holo.pose(0, 0, 90)); await page.waitForTimeout(250);
    await page.screenshot({ path: join(out, `${backend}-portrait-roll.png`) });
    await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(250);
    await page.evaluate(() => window.__holo.pose(-15, 0)); await page.waitForTimeout(250);
    await page.screenshot({ path: join(out, `${backend}-landscape.png`) });
    await page.setViewportSize({ width: 320, height: 568 });
    await page.evaluate(() => { document.querySelector('#ui').style.display = ''; });
    await page.waitForTimeout(250);
    const controls = await page.locator('.controls').boundingBox();
    assert.ok(controls.x >= 0 && controls.x + controls.width <= 320, 'all controls fit a 320px viewport');
    await page.screenshot({ path: join(out, `${backend}-small-controls.png`) });
    // Rapid asynchronous choices must commit the last card and its own optical maps.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(async () => {
      window.__holo.hideUI();
      await Promise.all([window.__holo.setCard('lugia-neo-genesis'), window.__holo.setCard('nocturne'), window.__holo.setCard('lugia-neo-genesis')]);
      window.__holo.pose(-15, 0);
    });
    assert.equal((await page.evaluate(() => window.__holo.stats())).card, 'lugia-neo-genesis');
    assert.equal((await page.evaluate(() => window.__holo.stats())).profile, 'pokemon-cosmos');
    assert.ok((await page.locator('#holo-select option:not([hidden])').evaluateAll(options => options.map(o => o.value))).includes('master-prism'), 'card selection preserves the full treatment library');
    await page.waitForTimeout(200);
    const cosmosA = await page.screenshot(); await page.waitForTimeout(250); const cosmosB = await page.screenshot();
    const cosmosStationary = await stationaryDifference(page, cosmosA, cosmosB);
    assert.ok(cosmosStationary.over1 === 0 && cosmosStationary.changed <= 50, 'classic Cosmos microstructure is temporally stable');
    await writeFile(join(out, `${backend}-cosmos.png`), cosmosA);
    await page.evaluate(async () => { await window.__holo.setProfile('pokemon-cosmos-hd'); });
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(out, `${backend}-cosmos-hd.png`) });
    await page.evaluate(async () => { await window.__holo.setCard('charizard-base-set'); window.__holo.pose(0, 0); });
    assert.equal((await page.evaluate(() => window.__holo.stats())).profile, 'pokemon-galaxy-star');
    await page.waitForTimeout(200);
    const starsA = await page.screenshot(); await page.waitForTimeout(200);
    const galaxyStationary = await stationaryDifference(page, starsA, await page.screenshot());
    assert.ok(galaxyStationary.over1 === 0 && galaxyStationary.changed <= 50, 'Galaxy-Star remains stable at rest');
    await writeFile(join(out, `${backend}-charizard.png`), starsA);
    const charizardMask = await page.evaluate(() => {
      const im = window.__holo.material().coverageTextureNode.value.image;
      const sample = (x, y) => im.data[(Math.floor(y / 825 * im.height) * im.width + Math.floor(x / 600 * im.width)) * 4] / 255;
      return { tail: sample(249, 371), flame: sample(196, 345), body: sample(355, 336), rules: sample(260, 531), background: sample(344, 150), fire: sample(144, 227) };
    });
    assert.ok(['tail', 'flame', 'body', 'rules'].every(key => charizardMask[key] < .01), 'the actual loaded mask preserves Charizard, the tail, its flame and rules');
    assert.ok(charizardMask.background > .99 && charizardMask.fire > .5, 'the background and breath remain foil');
    const printClip = await page.evaluate(() => {
      const h = window.__holo, d = h.cards.find(c => c.id === 'charizard-base-set').dimensions;
      const project = (x, y) => { const p = h.camera.position.clone().set((x / 600 - .5) * d.width, (.5 - y / 825) * d.height, d.thickness / 2).project(h.camera); return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2]; };
      const a = project(80, 474), b = project(520, 574); return { x: Math.ceil(a[0]), y: Math.ceil(a[1]), width: Math.floor(b[0] - a[0]), height: Math.floor(b[1] - a[1]) };
    });
    const printedA = await page.screenshot({ clip: printClip });
    await page.evaluate(() => { const u = window.__holo.material().optics; u.strength.value = 0; u.glintStrength.value = 0; u.foilReflectance.value = 0; });
    await page.waitForTimeout(160);
    const galaxyOptics = await stationaryDifference(page, starsA, await page.screenshot());
    assert.ok(galaxyOptics.over1 > 1000, 'live foil optics materially change the Charizard background');
    assert.equal((await stationaryDifference(page, printedA, await page.screenshot({ clip: printClip }))).over1, 0, 'foil cannot change the printed rules');
    await page.evaluate(async () => { await window.__holo.setCard('nocturne'); await window.__holo.setProfile('ygo-secret'); window.__holo.pose(0, 0); });
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(out, `${backend}-secondary-foil.png`) });
    for (const profile of ['microdiamond', 'topography', 'opal', 'solar-fresnel', 'liquid-spectrum', 'cathedral-prism', 'spectral-lattice', 'black-chrome-prism']) {
      await page.evaluate(async id => { await window.__holo.setProfile(id); window.__holo.pose(-15, 0); }, profile);
      await page.waitForTimeout(180); const a = await page.screenshot(); await page.waitForTimeout(150); const b = await page.screenshot();
      const difference = await stationaryDifference(page, a, b);
      assert.ok(difference.over1 === 0 && difference.changed <= 50, `${profile} remains stable with its additional optical features active`);
      await writeFile(join(out, `${backend}-${profile}.png`), a);
    }
    await page.evaluate(() => window.__holo.pose(0, 0));
    // Test actual rendered isolation, not just whether mask uniforms contain the right values.
    await page.evaluate(async () => {
      const { configureOpticalFixture } = await import('/src/debug/OpticalFixture.ts');
      window.__opticalFixture = configureOpticalFixture(window.__holo.material(), window.__holo.renderer);
    });
    await page.waitForTimeout(200);
    const regionsA = await page.screenshot();
    await writeFile(join(out, `${backend}-regions.png`), regionsA);
    await page.evaluate(() => { const u = window.__holo.material().optics; u.strength.value = 0; u.glintStrength.value = 0; u.foilReflectance.value = 0; });
    await page.waitForTimeout(100); const regionsB = await page.screenshot();
    await page.evaluate(() => { const u = window.__holo.material().secondaryOptics; u.strength.value = 0; u.glintStrength.value = 0; u.foilReflectance.value = 0; });
    await page.waitForTimeout(100); const regionsC = await page.screenshot();
    const isolation = await page.evaluate(async ({ a, b, c }) => {
      const decode = async data => {
        const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0); return ctx.getImageData(0, 0, img.width, img.height);
      };
      const [aa, bb, cc] = await Promise.all([decode(a), decode(b), decode(c)]);
      const counts = (first, second) => {
        let changed = 0, left = 1e9, right = 0;
        for (let i = 0; i < first.data.length; i += 4) if (Math.max(...[0, 1, 2].map(k => Math.abs(first.data[i + k] - second.data[i + k]))) > 3) {
          changed++; const x = (i / 4) % first.width; left = Math.min(left, x); right = Math.max(right, x);
        }
        return { changed, left, right };
      };
      return { primary: counts(aa, bb), secondary: counts(bb, cc) };
    }, { a: regionsA.toString('base64'), b: regionsB.toString('base64'), c: regionsC.toString('base64') });
    assert.ok(isolation.primary.changed > 1000 && isolation.secondary.changed > 1000, 'both optical regions independently affect visible pixels');
    assert.ok(isolation.primary.right < isolation.secondary.left, 'changing artwork foil does not change secondary foil or metal ink');
    await page.evaluate(() => window.__opticalFixture.dispose());
    report.push({ backend, passed: errors.length === 0, errors, stationary, cosmosStationary, galaxyStationary, galaxyOptics, charizardMask, isolation, stats: await page.evaluate(() => window.__holo.stats()) });
    await page.close();
  }
  console.log(JSON.stringify(report, null, 2)); await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  assert.ok(report.every(r => r.passed));
} finally { await browser.close(); }
