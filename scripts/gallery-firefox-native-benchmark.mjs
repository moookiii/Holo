import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

// Use the installed Firefox through its native WebDriver BiDi endpoint.
// A separate profile keeps the user's browsing session and preferences intact.
const url = process.env.GALLERY_URL || 'http://127.0.0.1:4176/Holo/';
const out = resolve('artifacts/gallery-firefox', process.env.GALLERY_RUN || 'installed-firefox');
await mkdir(join(out, 'profile'), { recursive: true });
const port = 9228, profile = join(out, 'profile');
const firefox = spawn(process.env.FIREFOX_EXE || 'C:/Program Files/Mozilla Firefox/firefox.exe',
  ['-headless', '-no-remote', '-profile', profile, '--remote-debugging-port', String(port), 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
for (let attempt = 0; attempt < 100; attempt++) {
  try {
    socket = await new Promise((resolveSocket, reject) => {
      const candidate = new WebSocket(`ws://127.0.0.1:${port}/session`);
      candidate.onopen = () => resolveSocket(candidate); candidate.onerror = reject;
    });
    break;
  } catch { await new Promise(done => setTimeout(done, 100)); }
}
if (!socket) { firefox.kill(); throw new Error('Installed Firefox did not open its BiDi endpoint'); }
let sequence = 0, context;
const pending = new Map(), report = { url, installedFirefox: true, errors: [], phases: [] };
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.method === 'log.entryAdded' && message.params.level === 'error') report.errors.push(message.params.text);
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.type === 'error') request.reject(new Error(JSON.stringify(message)));
  else request.resolve(message.result);
};
const call = (method, params = {}) => new Promise((resolveCall, reject) => {
  const id = ++sequence; pending.set(id, { resolve: resolveCall, reject }); socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await call('script.evaluate', { expression, target: { context }, awaitPromise: true });
  if (result.type !== 'success') throw new Error(JSON.stringify(result));
  return result.result.value;
};
const screenshot = () => call('browsingContext.captureScreenshot', { context, origin: 'viewport', format: { type: 'image/png' } });
async function measure(name, action) {
  const started = Date.now(); await action();
  await evaluate(`new Promise((resolve, reject) => {
    const started = performance.now(); let frames = 0;
    function tick() {
      const g = window.__holo?.gallery.instance(), viewport = document.querySelector('.gallery-viewport')?.getBoundingClientRect();
      const cards = viewport ? [...document.querySelectorAll('.gallery-card')].filter(card => {
        const b = card.getBoundingClientRect(), height = parseFloat(card.style.getPropertyValue('--card-height'));
        return b.top <= viewport.bottom && b.top + height >= viewport.top;
      }) : [];
      if (++frames > 2 && g?.active && !g.dirty && document.querySelector('#loading').hidden && cards.length
        && cards.every(card => card.classList.contains('is-ready')) && g.stats().visible >= cards.length) resolve();
      else if (performance.now() - started > 60000) reject(new Error('Visible gallery cards did not load'));
      else requestAnimationFrame(tick);
    } requestAnimationFrame(tick);
  })`);
  const readyMs = Date.now() - started, capture = await screenshot(), paintedMs = Date.now() - started;
  const state = JSON.parse(await evaluate(`(async () => {
    const h = window.__holo, g = h.gallery.instance(), gl = h.renderer.backend.gl;
    const image = new Image(); image.src = 'data:image/png;base64,${capture.data}'; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const viewport = g.viewport.getBoundingClientRect();
    const artwork = [...document.querySelectorAll('.gallery-card.is-ready')].flatMap(card => {
      const r = card.getBoundingClientRect(), height = parseFloat(card.style.getPropertyValue('--card-height'));
      const visibleTop = Math.max(r.top, viewport.top), visibleBottom = Math.min(r.top + height, viewport.bottom, image.height);
      if (visibleBottom <= visibleTop) return [];
      const full = r.top >= viewport.top && r.top + height <= viewport.bottom;
      const top = full ? r.top + height * .6 : visibleTop, bottom = full ? r.top + height * .85 : visibleBottom;
      const bytes = ctx.getImageData(Math.round(r.left + r.width * .2), Math.floor(top), Math.round(r.width * .6), Math.max(1, Math.floor(bottom) - Math.floor(top))).data;
      let lit = 0; for (let i = 0; i < bytes.length; i += 4) if (Math.max(bytes[i], bytes[i+1], bytes[i+2]) > 35) lit++;
      return [{ card: card.getAttribute('aria-label'), litFraction: lit / (bytes.length / 4) }];
    });
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return JSON.stringify({ gallery: g.stats(), cpu: h.cpuPreparation.stats(), startup: h.startupTiming, artwork,
      backend: h.renderer.backend.constructor.name, webgpu: h.renderer.backend.isWebGPUBackend === true,
      webgl: h.renderer.backend.isWebGLBackend === true, samples: h.renderer.samples,
      compatibilityMode: h.renderer.backend.compatibilityMode, deviceFeatures: h.renderer.backend.device ? [...h.renderer.backend.device.features] : undefined,
      browserReportedRenderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER),
      parallelCompile: !!gl?.getExtension('KHR_parallel_shader_compile'), frameMs: h.stats().frameMs,
      stages: window.__galleryStages });
  })()`));
  const row = { name, readyMs, paintedMs, ...state }; report.phases.push(row);
  await writeFile(join(out, `${name}.png`), Buffer.from(capture.data, 'base64'));
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  if (!state.artwork.length || state.artwork.some(card => card.litFraction < .1)) throw new Error(`${name}: artwork is black or absent`);
  console.log(JSON.stringify({ name, readyMs, paintedMs, minimumLitFraction: Math.min(...state.artwork.map(card => card.litFraction)), failed: state.gallery.failed }));
}
try {
  report.session = await call('session.new', { capabilities: {} });
  try { report.physicalAdapters = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion | ConvertTo-Json -Compress'], { encoding: 'utf8', windowsHide: true })); } catch {}
  context = (await call('browsingContext.create', { type: 'tab' })).context;
  await call('browsingContext.setViewport', { context, viewport: { width: 1440, height: 1100 }, devicePixelRatio: 1 });
  await call('session.subscribe', { events: ['log.entryAdded'] });
  await call('script.addPreloadScript', { functionDeclaration: `() => {
    window.__galleryStages = []; let debug;
    Object.defineProperty(window, '__holo', { configurable: true, get: () => debug, set(value) {
      debug = value;
      const backend = value.renderer.backend, create = backend.createRenderPipeline;
      backend.createRenderPipeline = function(object, promises) {
        const started = performance.now(), result = create.call(this, object, promises);
        if (object.object.name.startsWith('Gallery ')) window.__galleryStages.push({ stage: 'pipeline', name: object.object.name,
          started, ms: performance.now() - started, fragmentBytes: object.pipeline.fragmentProgram.code.length });
        return result;
      };
      const cpu = value.cpuPreparation, prepare = cpu.preparePreview;
      cpu.preparePreview = async function(...args) {
        const started = performance.now();
        try { return await prepare.apply(this, args); }
        finally { window.__galleryStages.push({ stage: 'preview', card: args[0]?.id, started, ms: performance.now() - started }); }
      };
    } });
  }` });
  if (process.env.GALLERY_START_VIEWER === '1') {
    const viewer = new URL(url); viewer.searchParams.set('lab', '');
    await call('browsingContext.navigate', { context, url: viewer.href, wait: 'interactive' });
    await evaluate(`new Promise(resolve => { function tick() { if (window.__holo?.lab && document.querySelector('#loading').hidden) resolve(); else requestAnimationFrame(tick); } tick(); })`);
    // Lab is the existing route that starts a viewer without opening Gallery.
    // Remove its overlay and restore the normal canvas before measuring the click.
    await evaluate(`window.__holo.lab.dispose(); new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    report.preOpeningGallery = await evaluate('!!window.__holo.gallery.instance()');
    await measure('first-open-from-viewer', () => evaluate(`document.querySelector('#gallery-open').click()`));
  } else await measure('cold-navigation', () => call('browsingContext.navigate', { context, url, wait: 'interactive' }));
  await measure('scroll-new', () => evaluate(`document.querySelector('.gallery-viewport').scrollTop += document.querySelector('.gallery-viewport').clientHeight`));
  await measure('scroll-return', () => evaluate(`document.querySelector('.gallery-viewport').scrollTop = 0`));
  const search = text => evaluate(`(() => {const s = document.querySelector('[aria-label="Search gallery cards"]');s.value=${JSON.stringify(text)};s.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await measure('search-lugia', () => search('Lugia'));
  await measure('search-clear', () => search(''));
  await evaluate('window.__holo.gallery.close()');
  await measure('open-from-viewer', () => evaluate(`document.querySelector('#gallery-open').click()`));
  if (report.errors.length) throw new Error(report.errors.join('\n'));
} catch (error) { report.failure = String(error); process.exitCode = 1; console.error(error); }
finally { await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2)); try { await call('browser.close'); } catch {} socket.close(); firefox.kill(); }
