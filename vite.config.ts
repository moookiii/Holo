import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages hosts this repo at /Holo/.
  // Keep local development at /.
  base: command === 'build' ? '/Holo/' : '/',

  server: {
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 200,
      ignored: [
        '**/artifacts/**',
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