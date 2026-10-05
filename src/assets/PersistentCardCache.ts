/** Binary source assets and exact derived pixels share a disk LRU, independent
 * of CPU/GPU residency. Storage denial/quota/corruption must never block cards. */
declare const __HOLO_CACHE_REVISION__: string;
let revision: Promise<string> | undefined;
export function cardCacheRevision() {
  return revision ??= (import.meta.env.DEV
    ? fetch(`${import.meta.env.BASE_URL}__holo-cache-revision`).then(response => {
      if (!response.ok) throw new Error('Cache revision unavailable');
      return response.text();
    }) : Promise.resolve(__HOLO_CACHE_REVISION__)).catch(() => `uncached-${Date.now()}`);
}

interface Metadata { key: string; bytes: number; used: number; }
export class PersistentCardCache {
  private database?: Promise<IDBDatabase | undefined>;
  private budget = 1024 * 1024 * 1024;
  readonly metrics = { hits: 0, misses: 0, writes: 0, errors: 0, evictions: 0, bytes: 0, readMs: 0, writeMs: 0 };
  constructor(private name = 'holo-card-data-v1', budget?: number) { if (budget !== undefined) this.budget = budget; }
  private open() {
    return this.database ??= (async () => {
      try {
        const quota = (await navigator.storage?.estimate())?.quota;
        if (quota) this.budget = Math.min(this.budget, Math.floor(quota * .2));
        return await new Promise<IDBDatabase | undefined>(resolve => {
          const request = indexedDB.open(this.name, 1);
          request.onupgradeneeded = () => {
            const db = request.result;
            db.createObjectStore('data');
            db.createObjectStore('meta', { keyPath: 'key' }).createIndex('used', 'used');
            db.createObjectStore('totals');
          };
          request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => db.close();
            const total = db.transaction('totals').objectStore('totals').get('bytes');
            total.onsuccess = () => { this.metrics.bytes = total.result ?? 0; };
            resolve(db);
          };
          request.onerror = () => { this.metrics.errors++; resolve(undefined); };
          request.onblocked = () => resolve(undefined);
        });
      } catch { this.metrics.errors++; return undefined; }
    })();
  }
  async get<T>(key: string): Promise<T | undefined> {
    const started = performance.now(), db = await this.open();
    if (!db) { this.metrics.misses++; return undefined; }
    try {
      const value = await new Promise<T | undefined>((resolve, reject) => {
        // Binary reads may run concurrently across workers. Updating LRU
        // metadata must not take an exclusive lock on all card pixel data.
        const tx = db.transaction('data', 'readonly');
        const request = tx.objectStore('data').get(key);
        let result: T | undefined;
        request.onsuccess = () => {
          result = request.result;
        };
        tx.oncomplete = () => resolve(result); tx.onabort = tx.onerror = () => reject(tx.error);
      });
      if (value !== undefined) {
        const touch = db.transaction('meta', 'readwrite'), meta = touch.objectStore('meta'), read = meta.get(key);
        read.onsuccess = () => { if (read.result) meta.put({ ...read.result, used: Date.now() }); };
        touch.onerror = () => { this.metrics.errors++; };
      }
      this.metrics[value === undefined ? 'misses' : 'hits']++;
      return value;
    } catch { this.metrics.errors++; this.metrics.misses++; return undefined; }
    finally { this.metrics.readMs += performance.now() - started; }
  }
  async set(key: string, value: unknown, bytes: number) {
    const started = performance.now(), db = await this.open();
    if (!db || bytes > this.budget || bytes < 0) return;
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['data', 'meta', 'totals'], 'readwrite');
        const data = tx.objectStore('data'), meta = tx.objectStore('meta'), totals = tx.objectStore('totals');
        const old = meta.get(key);
        old.onsuccess = () => {
          const total = totals.get('bytes');
          total.onsuccess = () => {
            let size = (total.result ?? 0) - (old.result?.bytes ?? 0) + bytes;
            data.put(value, key); meta.put({ key, bytes, used: Date.now() } satisfies Metadata);
            const finish = () => { totals.put(size, 'bytes'); this.metrics.bytes = size; };
            if (size <= this.budget) return finish();
            const cursor = meta.index('used').openCursor();
            cursor.onsuccess = () => {
              const row = cursor.result;
              if (!row || size <= this.budget) return finish();
              const entry = row.value as Metadata;
              if (entry.key !== key) { size -= entry.bytes; data.delete(entry.key); row.delete(); this.metrics.evictions++; }
              row.continue();
            };
          };
        };
        tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(tx.error);
      });
      this.metrics.writes++;
    } catch { this.metrics.errors++; }
    finally { this.metrics.writeMs += performance.now() - started; }
  }
  stats() { return { ...this.metrics, budget: this.budget }; }
}
export const persistentCards = new PersistentCardCache();
