interface Entry<T> { pending: Promise<T>; value?: T; refs: number; bytes: number; invalid: boolean; }
/** Async resource ownership, separate from viewer state. In-flight work is
 * shared; only idle entries can be evicted. Rejected jobs are retryable. */
export class WarmResourcePool<T> {
  private entries = new Map<string, Entry<T>>();
  private retired = new Set<Entry<T>>();
  hits = 0; misses = 0; evictions = 0;
  private disposed = false;
  private budget: number;
  private limit: number;
  private size: (value: T) => number;
  private destroy: (value: T) => void;
  constructor(budget: number, limit: number, size: (value: T) => number, destroy: (value: T) => void) {
    this.budget = budget; this.limit = limit; this.size = size; this.destroy = destroy;
  }
  acquire(key: string, create: () => Promise<T>) {
    if (this.disposed) throw new Error('Resource pool disposed');
    let entry = this.entries.get(key);
    if (entry?.invalid) { this.retired.add(entry); entry = undefined; }
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
          this.retired.delete(fresh);
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
      if (held.invalid && !held.refs && held.value !== undefined) {
        this.destroy(held.value); held.value = undefined;
        this.retired.delete(held);
        if (this.entries.get(key) === held) this.entries.delete(key);
      }
      this.trim();
    } };
  }
  private trim() {
    let bytes = [...this.entries.values(), ...this.retired].reduce((n, e) => n + e.bytes, 0);
    for (const [key, entry] of this.entries) {
      if (bytes <= this.budget && this.entries.size <= this.limit) break;
      if (entry.refs || entry.value === undefined) continue;
      bytes -= entry.bytes; this.destroy(entry.value); this.entries.delete(key); this.evictions++;
    }
  }
  stats() { return { hits: this.hits, misses: this.misses, evictions: this.evictions, entries: this.entries.size,
    bytes: [...this.entries.values(), ...this.retired].reduce((n, e) => n + e.bytes, 0), budget: this.budget }; }
  dispose() {
    this.disposed = true;
    for (const entry of [...this.entries.values(), ...this.retired]) if (entry.value !== undefined) { this.destroy(entry.value); entry.value = undefined; }
    this.entries.clear(); this.retired.clear();
  }
}
