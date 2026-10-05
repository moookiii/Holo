/** Async resource ownership, separate from viewer state. In-flight work is
 * shared; only idle entries can be evicted. Rejected jobs are retryable. */
export class WarmResourcePool<T> {
  private entries = new Map<string, { pending: Promise<T>; value?: T; refs: number; bytes: number; invalid: boolean }>();
  hits = 0; misses = 0; evictions = 0;
  private disposed = false;
  constructor(private budget: number, private limit: number, private size: (value: T) => number, private destroy: (value: T) => void) {}
  acquire(key: string, create: () => Promise<T>) {
    if (this.disposed) throw new Error('Resource pool disposed');
    let entry = this.entries.get(key);
    if (entry?.invalid) entry = undefined;
    if (entry) { this.hits++; this.entries.delete(key); this.entries.set(key, entry); }
    else {
      this.misses++;
      const fresh = { pending: undefined as unknown as Promise<T>, refs: 0, bytes: 0, invalid: false, value: undefined as T | undefined };
      entry = fresh; this.entries.set(key, fresh);
      fresh.pending = Promise.resolve().then(create).then(value => {
        fresh.value = value; fresh.bytes = this.size(value);
        if (this.disposed) { this.destroy(value); fresh.value = undefined; }
        else if (fresh.invalid && !fresh.refs) {
          this.destroy(value); fresh.value = undefined;
          if (this.entries.get(key) === fresh) this.entries.delete(key);
        }
        this.trim(); return value;
      }, error => { if (this.entries.get(key) === fresh) this.entries.delete(key); throw error; });
    }
    const held = entry; held.refs++;
    let released = false;
    return { pending: held.pending, invalidate: () => { held.invalid = true; }, release: (invalidate = false) => {
      if (released) return; released = true;
      held.invalid ||= invalidate; held.refs--;
      if (held.invalid && !held.refs && held.value) {
        this.destroy(held.value); held.value = undefined;
        if (this.entries.get(key) === held) this.entries.delete(key);
      }
      this.trim();
    } };
  }
  private trim() {
    let bytes = [...this.entries.values()].reduce((n, e) => n + e.bytes, 0);
    for (const [key, entry] of this.entries) {
      if (bytes <= this.budget && this.entries.size <= this.limit) break;
      if (entry.refs || !entry.value) continue;
      bytes -= entry.bytes; this.destroy(entry.value); this.entries.delete(key); this.evictions++;
    }
  }
  stats() { return { hits: this.hits, misses: this.misses, evictions: this.evictions, entries: this.entries.size,
    bytes: [...this.entries.values()].reduce((n, e) => n + e.bytes, 0), budget: this.budget }; }
  dispose() { this.disposed = true; for (const entry of this.entries.values()) if (entry.value) this.destroy(entry.value); this.entries.clear(); }
}
