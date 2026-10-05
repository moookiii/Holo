import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { cacheRevision, cacheRevisionPlugin } from './scripts/cache-revision';

export default defineConfig(({ command }) => ({
  // GitHub Pages hosts this repo at /Holo/.
  // Keep local development at /.
  base: command === 'build' ? '/Holo/' : '/',
  define: { __HOLO_CACHE_REVISION__: JSON.stringify(command === 'build' ? cacheRevision() : 'development') },
  plugins: [cacheRevisionPlugin(), {
    name: 'artifact-route-entry',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (index?.type === 'asset') this.emitFile({ type: 'asset', fileName: 'artifacts/index.html', source: index.source });
    },
  }],

  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Polling this asset-heavy checkout every 200 ms competes with card reads.
      // Native filesystem events retain live reload without scanning all PNGs.
      usePolling: false,
      ignored: [
        `${resolve('artifacts').replaceAll('\\', '/')}/**`,
        '**/docs/**',
        '**/research/**',
        '**/dist/**',
        '**/scripts/**',
        '**/tests/**',
      ],
    },
  },

  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1800,
  },
}));
