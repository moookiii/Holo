type Method = (...args: unknown[]) => unknown;
type Backend = Record<'createTexture' | 'updateTexture' | 'generateMipmaps', Method>;

/** CPU submission durations, not GPU execution timers. Includes cache misses
 * that residency deltas would hide when another texture is evicted. */
export class ResourceTelemetry {
  readonly stats = { textureAllocations: 0, textureUploads: 0, textureUploadCpuMs: 0, mipmapCalls: 0, mipmapCpuMs: 0 };
  private restores: (() => void)[] = [];
  constructor(backend: Backend) {
    for (const name of ['createTexture', 'updateTexture', 'generateMipmaps'] as const) {
      const original = backend[name];
      const probe: Method = (...args) => {
        const start = performance.now();
        try { return original.apply(backend, args); }
        finally {
          if (name === 'createTexture') this.stats.textureAllocations++;
          if (name === 'updateTexture') { this.stats.textureUploads++; this.stats.textureUploadCpuMs += performance.now() - start; }
          if (name === 'generateMipmaps') { this.stats.mipmapCalls++; this.stats.mipmapCpuMs += performance.now() - start; }
        }
      };
      backend[name] = probe;
      this.restores.push(() => { if (backend[name] === probe) backend[name] = original; });
    }
  }
  dispose() { this.restores.forEach(restore => restore()); }
}
