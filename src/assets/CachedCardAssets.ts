import { cardCacheRevision, persistentCards } from './PersistentCardCache';

const inflight = new Map<string, Promise<Blob>>();
const memory = new Map<string, Blob>();
const budget = 16 * 1024 * 1024;
let bytes = 0;
export const assetCacheMetrics = { downloads: 0, avoidedDownloads: 0, memoryHits: 0 };

export function resolveCardAsset(path: string, base = import.meta.env.BASE_URL) {
  return /^(blob:|data:|https?:\/\/)/.test(path) || path.startsWith(base) ? path : `${base}${path.replace(/^\/+/, '')}`;
}

/** Shared by gallery workers and full-resolution viewer loading. A per-URL
 * browser lock also deduplicates across workers/tabs. Completed downloads stay
 * useful even if the original card request has since scrolled offscreen. */
export async function cachedCardAsset(path: string): Promise<Blob> {
  const url = resolveCardAsset(path);
  const cached = memory.get(url);
  if (cached) {
    memory.delete(url); memory.set(url, cached);
    assetCacheMetrics.memoryHits++; assetCacheMetrics.avoidedDownloads++; return cached;
  }
  const running = inflight.get(url);
  if (running) { assetCacheMetrics.avoidedDownloads++; return running; }
  const request = (async () => {
    // Imported and remote mutable URLs use normal browser HTTP semantics. Only
    // authored same-origin assets are covered by the build content revision.
    const absolute = new URL(url, location.href);
    const persistent = absolute.origin === location.origin && !/^(blob:|data:)/.test(url);
    const key = persistent ? `asset:${await cardCacheRevision()}:${absolute.href}` : '';
    const load = async () => {
      const stored = key ? await persistentCards.get<Blob>(key) : undefined;
      if (stored instanceof Blob) { assetCacheMetrics.avoidedDownloads++; return stored; }
      assetCacheMetrics.downloads++;
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Unable to load ${url} (${response.status})`);
      if (response.headers.get('content-type')?.includes('text/html')) throw new Error(`Expected a card asset at ${url}, received HTML`);
      const blob = await response.blob();
      if (key) await persistentCards.set(key, blob, blob.size);
      return blob;
    };
    const blob = key && navigator.locks ? await navigator.locks.request(key, load) : await load();
    if (blob.size <= budget) {
      memory.set(url, blob); bytes += blob.size;
      while (bytes > budget) { const oldest = memory.keys().next().value!; bytes -= memory.get(oldest)!.size; memory.delete(oldest); }
    }
    return blob;
  })();
  inflight.set(url, request);
  try { return await request; } finally { inflight.delete(url); }
}
