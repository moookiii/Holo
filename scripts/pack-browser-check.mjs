import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) for (const version of (await readdir(base)).filter(v => /^chromium-\d+$/.test(v)).sort().reverse()) {
  const candidate = join(base, version, 'chrome-win64', 'chrome.exe'); if (existsSync(candidate)) { executablePath = candidate; break; }
}
const out = join(process.cwd(), 'artifacts', 'pack-interaction'); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [], report = [];
page.on('pageerror', error => errors.push(error.stack)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const state = () => page.evaluate(() => window.__holo.pack.stats());
const waitState = async name => { await page.waitForFunction(name => window.__holo.pack.stats().state === name, name, { timeout: 90000 }); };
const point = async (x, y, wrapper = false) => page.evaluate(([x, y, wrapper]) => {
  const h = window.__holo, p = h.camera.position.clone().set(x, y, 0);
  if (wrapper) h.scene.getObjectByName('Metalized foil wrapper').localToWorld(p);
  p.project(h.camera); return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2];
}, [x, y, wrapper]);
const drag = async (from, to, steps = 35) => { await page.mouse.move(...from); await page.mouse.down(); await page.mouse.move(...to, { steps }); await page.mouse.up(); await page.waitForTimeout(180); };
try {
  await page.goto(`http://127.0.0.1:5173/?backend=${process.env.PACK_BACKEND || 'webgpu'}`);
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  await page.getByRole('button', { name: 'Open a pack' }).click(); await waitState('PackReady');
  assert.equal(await page.evaluate(() => document.querySelector('#ui').inert), true);
  assert.deepEqual((await state()).orientation, [0, 0, 0, 1], 'pack starts upright');
  const containment = await page.evaluate(() => {
    const h = window.__holo;
    return [0, .25, .5, .75, 1].map(progress => {
      h.pack.setStage('intro', progress);
      const wrapperY = h.scene.getObjectByName('Metalized foil wrapper').position.y;
      return h.pack.stats().meshIds.map(id => {
        const card = h.scene.getObjectByProperty('uuid', id); return card.position.y - wrapperY;
      });
    });
  });
  for (const frame of containment) for (const y of frame) assert.ok(y > -.2 && y < 0, 'intro keeps all cards inside the moving wrapper');
  await page.evaluate(() => window.__holo.pack.setStage('sealed'));
  await drag(await point(-1.8, 0), await point(5, 0));
  assert.ok(Math.abs((await state()).orientation[1]) > .35, 'body drag rotates the pack freely');
  await page.evaluate(() => window.__holo.pack.pose(180));
  assert.ok(Math.abs((await state()).orientation[1]) > .999, 'pack rotates through its real back');
  await page.evaluate(() => window.__holo.pack.pose(360));
  assert.ok(Math.abs((await state()).orientation[3]) > .999, 'full revolution returns to the front');
  const meshes = (await state()).meshIds;
  assert.equal(new Set(meshes).size, 5);
  await page.evaluate(() => window.__holo.pack.setStage('sealed'));
  await drag(await point(-3, 5.28, true), await point(.3, 5.28, true));
  let stats = await state(); assert.equal(stats.state, 'Tear'); assert.ok(stats.tear > .3 && stats.tear < .8, `continuous partial tear: ${stats.tear}`);
  await page.screenshot({ path: join(out, 'pointer-half-tear.png') });
  const partial = stats.tear;
  await page.waitForTimeout(220); assert.ok((await state()).tear >= partial, 'tear does not heal when released');
  await drag(await point(2, 5.28, true), await point(7, 5.28, true)); await waitState('OpenWrapper');
  await drag(await point(0, 4.5, true), await point(0, 2, true)); await waitState('ExtractStack');
  await page.screenshot({ path: join(out, 'pointer-mouth-open.png') });
  await drag(await point(0, 3.8), await point(0, 13)); await waitState('RevealCard');
  await page.screenshot({ path: join(out, 'pointer-stack.png') });
  await drag(await point(0, 0), await point(0, 1));
  await page.waitForTimeout(550); assert.ok((await state()).reveal < .01, 'short reveal drag springs back');
  await page.mouse.click(...await point(0, 0));
  await page.waitForFunction(() => window.__holo.pack.stats().revealed, null, { timeout: 6000 });
  await page.screenshot({ path: join(out, 'pointer-first-reveal.png') });
  const clearances = await page.evaluate(() => {
    const h = window.__holo, gaps = [];
    const project = (mesh, axis) => {
      const d = mesh.userData.cardInstance.definition.dimensions, values = [];
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        const p = h.camera.position.clone().set(x*d.width/2, y*d.height/2, z*d.thickness/2).applyQuaternion(mesh.quaternion).add(mesh.position);
        values.push(p.dot(axis));
      }
      return [Math.min(...values), Math.max(...values)];
    };
    for (let i = 0; i <= 40; i++) {
      h.pack.setStage('stack'); h.pack.setRevealProgress(i/40);
      const ids = h.pack.stats().meshIds, upper = h.scene.getObjectByProperty('uuid', ids[0]), lower = h.scene.getObjectByProperty('uuid', ids[1]);
      const axis = h.camera.position.clone().set(0, 0, -1).applyQuaternion(lower.quaternion);
      gaps.push(project(upper, axis)[0] - project(lower, axis)[1]);
    }
    h.pack.setStage('reveal', 0); return gaps;
  });
  assert.ok(Math.min(...clearances) > 0, `card solids stay separated throughout a turn: ${Math.min(...clearances)}`);
  for (let i = 1; i < 5; i++) {
    await page.evaluate(() => window.__holo.pack.advance());
    assert.equal((await state()).active, i);
    await page.evaluate(() => window.__holo.pack.advance());
    await page.waitForFunction(() => window.__holo.pack.stats().revealed, null, { timeout: 6000 });
  }
  await waitState('HitReveal'); assert.deepEqual((await state()).meshIds, meshes, 'reveals preserve every original card mesh');
  await page.waitForTimeout(2200); await page.evaluate(() => window.__holo.pack.advance()); await waitState('PackSummary');
  await page.waitForTimeout(700);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  assert.ok((await page.locator('.pack-action').textContent()).includes('Blue-Eyes'), 'keyboard can select a middle card');
  await page.keyboard.press('Enter'); await waitState('Closed');
  assert.equal(await page.evaluate(() => window.__holo.stats().card), 'blue-eyes');
  assert.equal(await page.evaluate(() => window.__holo.scene.getObjectByName('card:blue-eyes').uuid), meshes[2], 'inspection transfers the same card mesh');
  assert.equal(await page.evaluate(() => window.__holo.factory.stats().instances), 1);
  assert.equal(await page.evaluate(() => document.querySelector('#ui').inert), false);
  await page.screenshot({ path: join(out, 'transferred-viewer-card.png') });
  await page.waitForTimeout(400);
  await page.mouse.move(720, 450); await page.waitForTimeout(300);
  await page.evaluate(() => window.__holo.setMode('rotate'));
  const originalPose = await page.evaluate(() => window.__holo.stats().quaternion);
  await page.mouse.click(720, 450); await page.waitForTimeout(750);
  const flippedPose = await page.evaluate(() => window.__holo.stats().quaternion);
  assert.ok(Math.abs(originalPose.reduce((sum, n, i) => sum + n*flippedPose[i], 0)) < .01, 'viewer click flips the actual card');
  await page.mouse.click(40, 450); await page.waitForTimeout(650);
  assert.deepEqual(await page.evaluate(() => window.__holo.stats().quaternion), flippedPose, 'clicking empty studio does not flip');
  // Race two preload requests, then close; cancelled instances must be released.
  await page.evaluate(async () => { await Promise.all([window.__holo.pack.open(), window.__holo.pack.open()]); });
  assert.equal(await page.evaluate(() => window.__holo.factory.stats().instances), 6);
  await page.evaluate(() => window.__holo.pack.close());
  assert.equal(await page.evaluate(() => window.__holo.factory.stats().instances), 1);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.__holo.pack.open()); await waitState('PackReady');
  assert.equal((await state()).reducedMotion, true);
  for (const name of ['OpenWrapper', 'ExtractStack', 'RevealCard']) { await page.locator('.pack-action').click(); await waitState(name); }
  await page.locator('.pack-action').click(); await page.waitForFunction(() => window.__holo.pack.stats().revealed);
  await page.screenshot({ path: join(out, 'reduced-motion-portrait.png') });
  await page.evaluate(() => window.__holo.pack.close());
  assert.equal(await page.evaluate(() => window.__holo.factory.stats().instances), 1);
  report.push('Direct tear/mouth/extract/reveal drags, spring-back, five separate meshes, keyboard selection, same-mesh viewer transfer, preload races, cleanup, reduced-motion portrait, 360-degree rotation, click flips, intro containment and 41-point solid clearance check passed.');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ report, errors }, null, 2));
} catch (error) { await page.screenshot({ path: join(out, 'failure.png') }); console.error(error); console.log(JSON.stringify({ state: await state(), errors }, null, 2)); process.exitCode = 1; }
finally { await writeFile(join(out, 'report.json'), JSON.stringify({ report, errors }, null, 2)); await browser.close(); }

