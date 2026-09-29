import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ command }) => ({
  // GitHub Pages hosts this repo at /Holo/.
  // Keep local development at /.
  base: command === 'build' ? '/Holo/' : '/',
  plugins: [{
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
      usePolling: true,
      interval: 200,
      ignored: [
        `${resolve('artifacts').replaceAll('\\', '/')}/**`,
        '**/docs/**',
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
