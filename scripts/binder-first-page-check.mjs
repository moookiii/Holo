import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const out = 'artifacts/favorites-binder';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const report = [];
const edgeComparison = process.env.BINDER_COMPARE === 'edge';
const backComparison = process.env.BINDER_COMPARE === 'back';
const materialComparison = edgeComparison || backComparison;
const baselineBackShots = new Map();
try {
  for (let run = 0; run < Number(process.env.BINDER_RUNS || 2); run++) {
    for (const baseline of [true, false]) {
      // Independent contexts: no HTTP, IndexedDB, CPU or binder GPU reuse.
      const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      page.on('console', message => {
        const text = message.text();
        // Hot reload is deliberately disconnected for benchmark stability.
        if (text.startsWith('[vite] failed to connect to websocket.') || text.startsWith('Failed to send error to Vite server:')) return;
        if (message.type() === 'error') errors.push(text);
      });
      await page.routeWebSocket('**', socket => socket.close());
      if (baseline && !materialComparison) await page.route('**/src/binder/BinderScene.ts*', async route => {
        const response = await route.fetch();
        const source = await response.text();
        assert.ok(source.includes('new BinderPage(index, side, this.materials, geometry)'));
        await route.fulfill({ response, body: source.replace('new BinderPage(index, side, this.materials, geometry)',
          'new BinderPage(index, side, this.materials)') });
      });
      if (baseline && edgeComparison) await page.route('**/src/card/CardFactory.ts*', async route => {
        const response = await route.fetch(), source = await response.text();
        assert.ok(source.includes('this.sharedEdgeMaterial(definition, profile, physical)'));
        await route.fulfill({ response, body: source.replace('this.sharedEdgeMaterial(definition, profile, physical)',
          'createEdgeMaterial(definition.construction ? profile.metallicInk : undefined, physical, definition.dimensions.thickness)') });
      });
      if (baseline && backComparison) await page.route('**/src/card/CardFactory.ts*', async route => {
        const response = await route.fetch(), source = await response.text();
        assert.ok(source.includes('this.createPrintedBack(definition, back, physical)'));
        await route.fulfill({ response, body: source.replace('this.createPrintedBack(definition, back, physical)',
          'createPrintMaterial(back, this.assets.black, physical.back, definition.backCrop, physical, definition.seed)') });
      });
      const url = new URL(process.env.BINDER_URL || 'http://127.0.0.1:5173/?backend=webgpu');
      url.searchParams.set('benchmark-cold-viewer', '1');
      await page.goto(url.href);
      await page.waitForFunction(() => {
        const s = window.__holo?.gallery.stats();
        return s?.active && s.visibleExpected && s.visible === s.visibleExpected && !s.visibleFailed;
      }, null, { timeout: 120000 });
      await page.evaluate(({ baseline, materialComparison }) => {
        const g = window.__holo.gallery.instance();
        if (g.binder) throw Error('Binder already constructed');
        if (g.options.cpu.stats().entries) throw Error('Full-quality cards already prepared');
        g.favorites.ids = new Set(g.catalog.cards().slice(0, 73).map(c => c.id));
        g.options.lighting.playing = false;
        g.options.lighting.setPreset('Skim');
        const timing = window.firstPageTiming = { start: performance.now(), frames: [], longTasks: [] };
        const renderer = window.__holo.renderer, created = renderer.debug.onNodeBuilderCreated;
        timing.edgeBuilds = 0;
        timing.backBuilds = 0;
        renderer.debug.onNodeBuilderCreated = function(builder, object) {
          const card = object.object.userData.cardInstance;
          if (card && object.material === card.mesh.material[2]) timing.edgeBuilds++;
          if (card && object.material === card.mesh.material[1]) timing.backBuilds++;
          created?.(builder, object);
        };
        const observer = new PerformanceObserver(list => {
          timing.longTasks.push(...list.getEntries().map(e => ({ at: e.startTime - timing.start, ms: e.duration })));
        });
        observer.observe({ type: 'longtask' });
        g.openBinder();
        // Reproduce the old presentation order without changing the loader,
        // assets, geometry, material response or preparation concurrency.
        if (baseline && !materialComparison) g.binder.physical.group.visible = true;
        timing.constructMs = performance.now() - timing.start;
        let previous = timing.start, readyFrame = false;
        const poll = now => {
          timing.frames.push(now - previous); previous = now;
          const s = g.stats();
          if (s.visible && !timing.firstMs) timing.firstMs = performance.now() - timing.start;
          const ready = s.visible === s.visibleExpected && !s.visibleFailed;
          // Count a rendered frame with every first-page card attached.
          if (ready && readyFrame) {
            timing.visibleMs = performance.now() - timing.start;
            observer.disconnect();
          } else { readyFrame = ready; requestAnimationFrame(poll); }
        };
        requestAnimationFrame(poll);
      }, { baseline, materialComparison });
      await page.waitForFunction(() => window.firstPageTiming.visibleMs, null, { timeout: 240000 });
      const result = await page.evaluate(() => {
        const binder = window.__holo.gallery.instance().binder;
        const pages = binder.physical.preparationPages ?? [...binder.physical.pages.values()];
        const surfaces = pages.flatMap(p => p.surfaces.map(s => s.mesh.geometry));
        const unique = [...new Set(surfaces)];
        return { timing: window.firstPageTiming, stats: window.__holo.gallery.stats(),
          edgeMaterials: new Set(pages.flatMap(p => [...p.cards.values()].map(c => c.mesh.material[2]))).size,
          geometry: { surfaces: surfaces.length, unique: unique.length,
            bytes: unique.reduce((sum, g) => sum + Object.values(g.attributes).reduce((n, a) => n + a.array.byteLength, 0), 0) } };
      });
      assert.equal(result.stats.visible, 12);
      assert.equal(result.stats.visibleFailed, 0);
      assert.ok(result.stats.residentCards >= 12 && result.stats.residentCards <= 36);
      assert.equal(result.geometry.unique, baseline && !materialComparison ? result.geometry.surfaces : 6);
      if (edgeComparison) {
        assert.equal(result.edgeMaterials, baseline ? result.stats.residentCards : 1);
        assert.equal(result.timing.edgeBuilds, baseline ? result.stats.residentCards : 1);
      }
      if (backComparison) assert.equal(result.timing.backBuilds, baseline ? result.stats.residentCards : 1);
      result.geometry.hashes = await page.evaluate(async baseline => {
        const physical = window.__holo.gallery.instance().binder.physical;
        const pages = physical.preparationPages ?? [...physical.pages.values()];
        if (new Set(pages.map(p => p.hit.geometry)).size !== pages.length) throw Error('Shared mutable raycast geometry');
        if (new Set(pages.map(p => p.poseTexture)).size !== pages.length) throw Error('Shared page pose texture');
        const hash = async geometry => Promise.all(Object.entries(geometry.attributes).map(async ([key, attr]) => {
          const bytes = new Uint8Array(attr.array.buffer, attr.array.byteOffset, attr.array.byteLength);
          const digest = await crypto.subtle.digest('SHA-256', bytes);
          return [key, [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')];
        }));
        const result = {};
        for (const side of [-1, 1]) {
          const sameSide = pages.filter(p => p.side === side);
          result[side] = await Promise.all(sameSide[0].surfaces.map(s => hash(s.mesh.geometry)));
        if (!sameSide.every(p => p.surfaces.every((s, i) => baseline || s.mesh.geometry === sameSide[0].surfaces[i].mesh.geometry)))
            throw Error('Page buffers were not shared');
        }
        return result;
      }, baseline);
      await page.screenshot({ path: `${out}/first-page-${baseline ? 'baseline' : 'ready'}-${run}.png` });
      // Let the existing bounded neighbor queue finish; exercise a populated
      // turn so faster startup cannot conceal missing first-turn resources.
      await page.waitForFunction(() => !window.__holo.gallery.stats().pending, null, { timeout: 240000 });
      result.turn = await page.evaluate(async () => {
        const g = window.__holo.gallery.instance(), backend = window.__holo.renderer.backend;
        let pipelines = 0, textures = 0;
        const createPipeline = backend.createRenderPipeline, createTexture = backend.createTexture;
        backend.createRenderPipeline = function(...args) { pipelines++; return createPipeline.apply(this, args); };
        backend.createTexture = function(...args) { textures++; return createTexture.apply(this, args); };
        g.binder.turn(1);
        while (g.binder.navigation.turn) await new Promise(r => requestAnimationFrame(r));
        backend.createRenderPipeline = createPipeline; backend.createTexture = createTexture;
        return { pipelines, textures, visible: g.stats().visible, failed: g.stats().visibleFailed };
      });
      assert.deepEqual(result.turn, { pipelines: 0, textures: 0, visible: 24, failed: 0 });
      if (backComparison && process.env.BINDER_VISUAL === '1') {
        const ids = await page.evaluate(() => window.__holo.gallery.instance().binder.cards.slice(0, 2).map(c => c.id));
        await page.evaluate(async id => { await window.__holo.gallery.instance().binder.inspect(id); window.__holo.hideUI(); }, ids[0]);
        await page.mouse.move(800, 500);
        result.backPixels = [];
        for (const id of ids) {
          await page.evaluate(async id => { await window.__holo.setCard(id); window.__holo.lighting.playing = false; }, id);
          for (const [yaw, pitch, light] of [[180, 0, 'Studio'], [155, 12, 'Skim']]) {
            await page.evaluate(({ yaw, pitch, light }) => {
              const h = window.__holo; h.pose(yaw, pitch); h.zoom(1);
              h.lighting.setPreset(light); h.lighting.playing = false;
            }, { yaw, pitch, light });
            await page.waitForTimeout(250);
            const shot = await page.screenshot({ path: `${out}/back-${baseline ? 'baseline' : 'shared'}-${run}-${id}-${light}.png` });
            const key = `${run}:${id}:${light}`;
            if (baseline) baselineBackShots.set(key, shot.toString('base64'));
            else {
              const pixels = await page.evaluate(async shots => {
                const data = [];
                for (const shot of shots) {
                  const image = new Image(); image.src = `data:image/png;base64,${shot}`; await image.decode();
                  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
                  const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
                  data.push(ctx.getImageData(0, 0, image.width, image.height).data);
                }
                let sum = 0, changed = 0;
                for (let i = 0; i < data[0].length; i += 4) for (let c = 0; c < 3; c++) {
                  const difference = Math.abs(data[0][i + c] - data[1][i + c]); sum += difference;
                  if (difference > 2) changed++;
                }
                return { meanChannelDifference: sum / (data[0].length * .75), changedChannelsAbove2: changed };
              }, [baselineBackShots.get(key), shot.toString('base64')]);
              result.backPixels.push({ id, light, ...pixels });
              assert.ok(pixels.meanChannelDifference < .03, `${id}/${light}: seed-specific back pixels changed`);
            }
          }
        }
      }
      if (edgeComparison && !baseline) {
        result.edgeLifetime = await page.evaluate(async () => {
          const binder = window.__holo.gallery.instance().binder, factory = binder.factory;
          await binder.suspendPreparation();
          const cards = [...binder.physical.pages.values()].flatMap(p => [...p.cards.values()]);
          const edge = cards[0].mesh.material[2];
          let edgeDisposals = 0, variantDisposals = 0;
          edge.addEventListener('dispose', () => edgeDisposals++);
          cards[0].dispose();
          const survivedCardRemoval = edgeDisposals === 0 && cards[1].mesh.material[2] === edge;
          const prepared = await binder.options.cpu.cached(cards[1].definition);
          const variant = await factory.realizeCardGpu({ ...prepared, definition: { ...prepared.definition,
            dimensions: { ...prepared.definition.dimensions, thickness: prepared.definition.dimensions.thickness * 1.1 } } }, undefined, false);
          const separateThickness = variant.mesh.material[2] !== edge;
          variant.mesh.material[2].addEventListener('dispose', () => variantDisposals++);
          variant.dispose();
          factory.dispose();
          return { survivedCardRemoval, separateThickness, edgeDisposals, variantDisposals, allCardsDisposed: cards.every(c => c.disposed) };
        });
        assert.deepEqual(result.edgeLifetime, { survivedCardRemoval: true, separateThickness: true,
          edgeDisposals: 1, variantDisposals: 1, allCardsDisposed: true });
      }
      assert.deepEqual(errors, []);
      const frames = result.timing.frames.toSorted((a, b) => a - b);
      result.frameP95Ms = frames[Math.floor(frames.length * .95)];
      result.maxFrameMs = frames.at(-1);
      result.baseline = baseline; result.run = run; result.errors = errors;
      report.push(result);
      if (!baseline) assert.deepEqual(result.geometry.hashes, report.at(-2).geometry.hashes,
        'Shared vertices, normals and UVs must match the per-page baseline byte for byte');
      console.log(JSON.stringify({ baseline, run, visibleMs: result.timing.visibleMs, firstMs: result.timing.firstMs,
        frameP95Ms: result.frameP95Ms, maxFrameMs: result.maxFrameMs,
        constructMs: result.timing.constructMs, geometry: result.geometry,
        edgeMaterials: result.edgeMaterials, edgeBuilds: result.timing.edgeBuilds,
        backBuilds: result.timing.backBuilds,
        longTasks: result.timing.longTasks.length, gpuBytes: result.stats.residentGpuBytes, turn: result.turn }));
      await context.close();
    }
  }
} finally {
  await writeFile(`${out}/first-page${materialComparison ? `-${process.env.BINDER_COMPARE}` : ''}-report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
