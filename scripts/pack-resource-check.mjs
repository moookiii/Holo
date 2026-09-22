import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.addInitScript(() => { window.requestIdleCallback = () => 0; });
  await page.goto(process.env.HOLO_URL ?? 'http://127.0.0.1:5173/');
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 120000 });
  const cpu = await page.evaluate(async () => {
    const h = window.__holo, before = h.factory.stats(), signal = new AbortController().signal;
    const common = h.cards.find(card => card.profile === 'print-only');
    const minimal = await h.cpuPreparation.prepare({ ...common, id: 'test-minimal-print',
      maps: { foil: '/must-not-fetch.png', direction: '/must-not-fetch.png', pattern: '/must-not-fetch.png' },
      profileOverrides: { structure: { field: 'symbol-foil' } } }, signal);
    const svg = await h.cpuPreparation.prepare(h.cards.find(card => card.id === 'tyranitar-paldea-evolved'), signal);
    window.__resourceFixture = minimal;
    return { before, after: h.factory.stats(), packed: !!minimal.maps.packed, fields: Object.values(minimal.fields).some(Boolean),
      svgPacked: !!svg.maps.packed, patternMs: h.cpuPreparation.stats().patternMs };
  });
  assert.deepEqual(cpu.before, cpu.after, 'CPU-only preparation never touches the resource factory');
  assert.equal(cpu.packed, false); assert.equal(cpu.fields, false); assert.equal(cpu.svgPacked, true);
  await page.evaluate(() => { window.__holo.pack.setSeed(0x12345678); return window.__holo.pack.open(); });
  const resources = await page.evaluate(async () => {
    const h = window.__holo, prepared = window.__resourceFixture;
    const first = await h.factory.realizeCardGpu(prepared, undefined, false), second = await h.factory.realizeCardGpu(prepared, undefined, false);
    const art = first.mesh.material[0].printTextureNode.value;
    let disposed = 0; art.addEventListener('dispose', () => disposed++);
    const shared = art === second.mesh.material[0].printTextureNode.value;
    first.dispose(); const survives = disposed === 0; second.dispose();
    const imported = { ...prepared, definition: { ...prepared.definition, id: 'test-import', imported: true },
      front: { ...prepared.front, source: 'blob:test-import-front' }, back: { ...prepared.back, source: 'blob:test-import-back' } };
    const a = await h.factory.realizeCardGpu(imported, undefined, false), b = await h.factory.realizeCardGpu(imported, undefined, false);
    let importedDisposed = 0;
    a.mesh.material[0].printTextureNode.value.addEventListener('dispose', () => importedDisposed++);
    a.dispose(); const importSurvives = importedDisposed === 0; b.dispose();
    const { PackWrapper } = await import('/src/pack/wrapper/PackWrapper.ts');
    const { getPack } = await import('/src/pack/PackDefinition.ts');
    const w1 = await PackWrapper.create(getPack('archive-01'), h.factory.assets);
    const w2 = await PackWrapper.create(getPack('archive-01'), h.factory.assets);
    const meshes = wrapper => { const result = []; wrapper.root.traverse(o => { if (o.isMesh) result.push(o); }); return result; };
    const m1 = meshes(w1), m2 = meshes(w2);
    const identical = m1.every((m, i) => Object.keys(m.geometry.attributes).every(name => {
      const a = m.geometry.attributes[name].array, b = m2[i].geometry.attributes[name].array;
      return a !== b && a.length === b.length && a.every((v, j) => v === b[j]);
    }));
    w1.tearPath.fill(.6); w1.deform({ tear: .6, mouth: .3, grip: 0, release: 0, collapse: 0, tension: 0, pullX: 0, pullY: 0 });
    const independentTear = w2.tearPath.progress === 0;
    w1.dispose(); const survivingGeometry = m2.every(m => m.geometry.getAttribute('position').count > 0); w2.dispose();
    return { shared, survives, importSurvives, importedDisposed, identical, independentTear, survivingGeometry, meshCount: m1.length };
  });
  assert.equal(resources.shared, true); assert.equal(resources.survives, true);
  assert.equal(resources.importSurvives, true); assert.equal(resources.importedDisposed, 1);
  assert.equal(resources.identical, true); assert.equal(resources.independentTear, true); assert.equal(resources.survivingGeometry, true);
  const profileSwitch = await page.evaluate(async () => {
    const h = window.__holo; h.pack.close(); await h.setCard('common-pokemon-mankey');
    const printBefore = h.material().constructor.name;
    await h.setProfile('master-prism'); const holo = h.material().constructor.name;
    await h.setProfile('print-only'); return { printBefore, holo, printAfter: h.material().constructor.name };
  });
  assert.deepEqual(profileSwitch, { printBefore: 'PrintFrontMaterial', holo: 'HolographicMaterial', printAfter: 'PrintFrontMaterial' });
  assert.deepEqual(errors, []);
  await mkdir('artifacts/pack-resources', { recursive: true });
  await writeFile('artifacts/pack-resources/report.json', JSON.stringify({ cpu, resources, profileSwitch, errors }, null, 2));
  console.log(JSON.stringify({ resources, profileSwitch, errors }));
} finally { await browser.close(); }
