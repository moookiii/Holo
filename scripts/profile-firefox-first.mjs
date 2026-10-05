import { firefox } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
const browser = await firefox.launch({ executablePath: process.env.BROWSER_EXECUTABLE || firefox.executablePath(), headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.on('pageerror', e => console.log(String(e)));
try {
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForFunction(() => window.__holo?.gallery.stats()?.visible > 0, null, { timeout: 120000 });
  const result = await page.evaluate(async () => {
    const h = window.__holo, rows = [], nodes = h.renderer._nodes, backend = h.renderer.backend;
    const build = nodes.getForRenderAsync;
    nodes.getForRenderAsync = async function (...args) {
      const start = performance.now(); try { return await build.apply(this, args); }
      finally { rows.push({ stage: 'nodes', ms: performance.now() - start, material: args[0].material.type }); }
    };
    const create = backend.createRenderPipeline;
    backend.createRenderPipeline = function (object, promises) {
      const start = performance.now(), count = promises?.length ?? 0;
      const complete = backend._completeCompile;
      backend._completeCompile = function (...args) {
        const gl = backend.gl, sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        promises.push(new Promise((resolve, reject) => {
          const poll = () => {
            const status = gl.clientWaitSync(sync, 0, 0);
            if (status === gl.TIMEOUT_EXPIRED) return requestAnimationFrame(poll);
            gl.deleteSync(sync);
            const started = performance.now();
            try { complete.apply(backend, args); resolve(); } catch (error) { reject(error); }
            rows.push({ stage: 'final-link-status', ms: performance.now() - started });
          }; requestAnimationFrame(poll);
        }));
      };
      let result;
      try { result = create.call(this, object, promises); }
      finally { backend._completeCompile = complete; }
      rows.push({ stage: 'driver-submit', ms: performance.now() - start, material: object.material.type, fragmentLength: object.pipeline.fragmentProgram.code.length });
      if (promises) void Promise.all(promises.slice(count)).then(() => rows.push({ stage: 'driver-ready', ms: performance.now() - start, material: object.material.type }));
      return result;
    };
    const start = performance.now(); await h.gallery.close('alakazam-base-set');
    return { ms: performance.now() - start, rows, opening: h.opening(), parallel: !!backend.parallel };
  });
  await mkdir('artifacts/firefox-first', { recursive: true });
  await writeFile('artifacts/firefox-first/report.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
