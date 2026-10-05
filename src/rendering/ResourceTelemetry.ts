type Method = (...args: unknown[]) => unknown;
type Backend = Record<'createTexture' | 'updateTexture' | 'generateMipmaps', Method>;
const observers = new WeakMap<Backend, Set<ResourceTelemetry>>();
const restorers = new WeakMap<Backend, (() => void)[]>();

/** CPU submission durations, not GPU execution timers. Includes cache misses
 * that residency deltas would hide when another texture is evicted. */
export class ResourceTelemetry {
  readonly stats = { textureAllocations: 0, textureUploads: 0, textureUploadCpuMs: 0, mipmapCalls: 0, mipmapCpuMs: 0 };
  private observers: Set<ResourceTelemetry>;
  private backend: Backend;
  constructor(backend: Backend) {
    this.backend = backend;
    let listeners = observers.get(backend);
    const installed = !!listeners;
    if (!listeners) { listeners = new Set(); observers.set(backend, listeners); }
    this.observers = listeners; listeners.add(this);
    if (installed) return;
    const restores: (() => void)[] = []; restorers.set(backend, restores);
    for (const name of ['createTexture', 'updateTexture', 'generateMipmaps'] as const) {
      const original = backend[name];
      const probe: Method = (...args) => {
        const start = performance.now();
        try { return original.apply(backend, args); }
        finally {
          for (const listener of listeners) {
            if (name === 'createTexture') listener.stats.textureAllocations++;
            if (name === 'updateTexture') { listener.stats.textureUploads++; listener.stats.textureUploadCpuMs += performance.now() - start; }
            if (name === 'generateMipmaps') { listener.stats.mipmapCalls++; listener.stats.mipmapCpuMs += performance.now() - start; }
          }
        }
      };
      backend[name] = probe;
      restores.push(() => { if (backend[name] === probe) backend[name] = original; });
    }
  }
  dispose() {
    this.observers.delete(this);
    if (!this.observers.size) {
      restorers.get(this.backend)?.forEach(restore => restore());
      restorers.delete(this.backend); observers.delete(this.backend);
    }
  }
}
