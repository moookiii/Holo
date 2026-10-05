import { SharedPreparation } from './SharedPreparation.ts';

/** Reusable decoded inputs, independent of complete previews and GPU slots.
 * Consumers receive owned copies because front alpha is modified during packing. */
export class PreviewPixelCache {
  private entries = new Map<string, Uint8Array>();
  private jobs = new SharedPreparation<Uint8Array>();
  private bytes = 0;
  readonly metrics = { hits: 0, misses: 0, evictions: 0, decodes: 0, decodeMs: 0, persistentHits: 0 };
  readonly budget: number;
  constructor(budget = 16 * 1024 * 1024) { this.budget = budget; }
  async read(key: string, signal: AbortSignal, load: (signal: AbortSignal) => Promise<Uint8Array>) {
    signal.throwIfAborted();
    const cached = this.entries.get(key);
    if (cached) {
      this.metrics.hits++;
      this.entries.delete(key); this.entries.set(key, cached);
      return cached.slice();
    }
    this.metrics.misses++;
    const pixels = await this.jobs.run(key, signal, async sharedSignal => {
      const pixels = await load(sharedSignal);
      if (pixels.byteLength <= this.budget) {
        const old = this.entries.get(key);
        if (old) this.bytes -= old.byteLength;
        this.entries.delete(key); this.entries.set(key, pixels); this.bytes += pixels.byteLength;
        while (this.bytes > this.budget) {
          const oldest = this.entries.keys().next().value!;
          this.bytes -= this.entries.get(oldest)!.byteLength; this.entries.delete(oldest); this.metrics.evictions++;
        }
      }
      return pixels;
    });
    signal.throwIfAborted();
    return pixels.slice();
  }
  stats() { return { ...this.metrics, deduplicated: this.jobs.hits, bytes: this.bytes, budget: this.budget,
    avoidedDecodes: this.metrics.hits + this.jobs.hits + this.metrics.persistentHits }; }
}
