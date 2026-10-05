import { build, preview } from 'vite';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// Build real production chunks without duplicating the multi-gigabyte public
// tree. Vite serves the bundle; this read-only fallback serves authored assets.
const outDir = process.env.GALLERY_BUILD || 'artifacts/gallery-build', publicRoot = resolve('public');
const port = Number(process.env.GALLERY_PORT || 4176);
await build({ build: { outDir, copyPublicDir: false, emptyOutDir: true } });
await preview({ base: '/Holo/', build: { outDir }, preview: { host: '127.0.0.1', port, strictPort: true },
  plugins: [{ name: 'benchmark-public-assets', configurePreviewServer(server) {
    server.middlewares.use(async (request, response, next) => {
      try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        if (!pathname.startsWith('/Holo/')) return next();
        const path = resolve(publicRoot, pathname.slice('/Holo/'.length));
        if (!path.startsWith(publicRoot + sep) || !(await stat(path)).isFile()) return next();
        const extension = path.split('.').pop();
        response.setHeader('Content-Type', ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', bin: 'application/octet-stream', json: 'application/json' })[extension] || 'application/octet-stream');
        createReadStream(path).pipe(response);
      } catch { next(); }
    });
  } }],
});
console.log(`Production gallery benchmark: http://127.0.0.1:${port}/Holo/`);
