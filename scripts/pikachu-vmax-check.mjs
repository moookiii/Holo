/** Reproducible physical-surface review, optical ablations and moving captures.
 * Start npm run dev, then node scripts/pikachu-vmax-check.mjs.
 * PIKACHU_BACKEND=webgl checks the supported fallback as well.
 */
import { chromium } from 'playwright';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const backend = process.env.PIKACHU_BACKEND || 'webgpu';
const out = join(process.cwd(), 'artifacts', `pikachu-review-${backend}`);
await mkdir(out, { recursive: true });
const options = { headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] };
if (!existsSync(chromium.executablePath())) {
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const dir of (await readdir(root)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const path = join(root, dir, 'chrome-win64', 'chrome.exe');
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const browser = await chromium.launch(options);
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1,
  ...(backend === 'webgpu' ? {recordVideo: { dir: out, size: { width: 1280, height: 1000 } }} : {}) });
const page = await context.newPage();
const errors = [], warnings = [], captures = [];
page.on('pageerror', e => errors.push(e.stack));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
const shot = async name => {
  await page.waitForTimeout(180);
  const buffer = await page.screenshot({ path: join(out, `${name}.png`), timeout: 30000 });
  console.log(`${backend}: ${name}`);
  captures.push(name); return buffer.toString('base64');
};
const difference = async (a, b) => page.evaluate(async ([a, b]) => {
  const decode = async data => {
    const im = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
    const canvas = new OffscreenCanvas(im.width, im.height), ctx = canvas.getContext('2d');
    ctx.drawImage(im, 0, 0); return ctx.getImageData(0, 0, im.width, im.height).data;
  };
  const aa = await decode(a), bb = await decode(b); let total = 0, pixels = 0, maximum = 0;
  for (let i = 0; i < aa.length; i += 4) {
    if (Math.max(aa[i], aa[i+1], aa[i+2], bb[i], bb[i+1], bb[i+2]) < 12) continue;
    for (let c = 0; c < 3; c++) { const d = Math.abs(aa[i+c]-bb[i+c]); total += d; maximum = Math.max(maximum, d); }
    pixels++;
  }
  return { mean: total / Math.max(1, pixels*3), maximum, pixels };
}, [a, b]);

try {
  await page.goto(`http://127.0.0.1:5173/?backend=${backend}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  await page.evaluate(() => window.__holo.setCard('pikachu-vmax-vivid-voltage'));
  const initial = await page.evaluate(() => ({ stats: window.__holo.stats(),
    period: window.__holo.material().optics.period.value, strength: window.__holo.material().optics.strength.value,
    normal: window.__holo.material().surfaceControls.hasNormal.value,
    directionSize: [window.__holo.material().fieldTextureNode.value.image.width, window.__holo.material().fieldTextureNode.value.image.height],
    packedSize: [window.__holo.material().surfaceTextureNode.value.image.width, window.__holo.material().surfaceTextureNode.value.image.height] }));
  assert.equal(initial.stats.profile, 'pokemon-rainbow-etched');
  assert.equal(initial.normal, 1); assert.deepEqual(initial.directionSize, [1468, 2048]);
  assert.deepEqual(initial.packedSize, [1468, 2048]);
  await shot('presentation');
  // Exercise the normal picker, not just the debug setter.
  await page.locator('#card-toggle').click();
  await page.locator('#card-search').fill('188/185');
  const picker = await page.locator('.card-grid .card-option').getAttribute('title');
  assert.ok(picker.includes('Pikachu VMAX') && picker.includes('188/185'), 'Exact printing is discoverable through the card picker');
  await shot('picker');
  await page.locator('.card-grid .card-option').click();
  await page.evaluate(() => window.__holo.hideUI());
  const poses = [['front',0,0,0], ['left',-22,5,0], ['right',22,5,0], ['key',-15,-15,0],
    ['diagonal',-28,24,20], ['grazing-65',65,8,0], ['grazing-80',80,-10,0], ['edge',88,0,0], ['back',180,0,0]];
  for (const light of ['Studio','Soft','Strip','Low key']) {
    await page.evaluate(l => window.__holo.lighting.setPreset(l), light);
    for (const [name,...pose] of poses) {
      await page.evaluate(p => window.__holo.pose(...p), pose);
      await shot(`${light.toLowerCase().replace(' ','-')}-${name}`);
    }
  }
  await page.evaluate(() => { window.__holo.lighting.setPreset('Strip'); window.__holo.pose(0,0,0); });
  const fixed = await shot('fixed-a'), repeated = await shot('fixed-b');
  const temporal = await difference(fixed, repeated);
  assert.ok(temporal.mean < .05, `Fixed surface changes with time: ${temporal.mean}`);
  await page.evaluate(() => { window.__holo.material().optics.strength.value = 0; });
  const noSpectrum = await shot('no-diffraction');
  const diffraction = await difference(fixed, noSpectrum);
  assert.ok(diffraction.mean > .08, 'The Rainbow Rare needs a real dynamic diffraction contribution');
  await page.evaluate(s => { window.__holo.material().optics.strength.value = s; window.__holo.material().surfaceControls.normalScale.value = 0; }, initial.strength);
  const noNormal = await shot('no-etched-normal');
  const relief = await difference(fixed, noNormal);
  assert.ok(relief.mean > .08, 'Authored etched normals must affect reflected light');
  await page.evaluate(() => { window.__holo.material().surfaceControls.normalScale.value = 1; window.__holo.zoom(.62); window.__holo.pose(12,5,0); });
  await shot('macro-relief');
  await page.evaluate(() => {
    const h=window.__holo; h.zoom(1); h.pose(0,0,0); h.scene.environmentIntensity=0;
    h.scene.traverse(o => { if (o.isLight) o.intensity=0; });
  });
  const unlit = await shot('unlit');
  const dark = await page.evaluate(async data => {
    const im = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
    const c = new OffscreenCanvas(im.width, im.height), ctx=c.getContext('2d'); ctx.drawImage(im,0,0);
    const d=ctx.getImageData(0,0,im.width,im.height).data; let maximum=0;
    for(let i=0;i<d.length;i+=4) maximum=Math.max(maximum,d[i],d[i+1],d[i+2]);
    return maximum;
  }, unlit);
  assert.ok(dark < 10, `Unlit card emits colored light (${dark}/255)`);
  await page.evaluate(() => { window.__holo.lighting.setPreset('Studio'); window.__holo.lighting.back.intensity=1.1; });
  // Continuous movement, including grazing and a complete turn to the shared back.
  for (let i=0;i<160;i++) {
    const a=i/159;
    await page.evaluate(a => window.__holo.pose(-38+76*a,12*Math.sin(a*Math.PI*2),4*Math.sin(a*Math.PI*2)),a);
    await page.waitForTimeout(35);
    if (i%8===0) await shot(`motion-${String(i/8).padStart(2,'0')}`);
  }
  for (let i=0;i<=100;i++) {
    await page.evaluate(a=>window.__holo.pose(a,0,0),i*3.6); await page.waitForTimeout(30);
    if(i%10===0) await shot(`turn-${String(i/10).padStart(2,'0')}`);
  }
  await page.evaluate(()=>window.__holo.pose(10,5,0));
  await shot('final');
  assert.deepEqual(errors, [], 'Browser/shader errors');
  await writeFile(join(out,'report.json'),JSON.stringify({initial,temporal,diffraction,relief,unlitMaximum:dark,
    final:await page.evaluate(()=>window.__holo.stats()),captures,errors,warnings},null,2));
  console.log(JSON.stringify({backend,temporal,diffraction,relief,unlitMaximum:dark,errors,warnings},null,2));
} catch (error) {
  await writeFile(join(out,'failure.json'),JSON.stringify({error:String(error),captures,errors,warnings},null,2));
  throw error;
} finally { await context.close(); await browser.close(); }
