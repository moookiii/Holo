import { build } from 'vite';
// Compile the production entry and workers without copying the multi-set
// public library a second time. Public source assets are audited separately.
await build({ build: { outDir: 'artifacts/evolutions/compiled', copyPublicDir: false } });
