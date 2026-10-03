import type { ProductFamily, YugiohCatalogSet, YugiohFormat } from '../types.ts';
import { implementationFor } from './implementations.ts';

export const CATALOG_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardsets.php';
const CACHE_KEY = 'holo:yugioh:catalog:v1';
const MAX_AGE = 24 * 60 * 60 * 1000;
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;
function date(value: unknown) {
  const s = text(value);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s ? s : undefined;
}
function family(name: string, code?: string): [ProductFamily, YugiohCatalogSet['groupingBasis']] {
  if (code === 'LOB' && name === 'Legend of Blue Eyes White Dragon') return ['Booster pack', 'curated'];
  if (/structure deck/i.test(name)) return ['Structure deck', 'name-derived'];
  if (/starter (deck|set)/i.test(name)) return ['Starter deck', 'name-derived'];
  if (/tournament pack|OTS |astral pack|champion pack|turbo pack/i.test(name)) return ['Tournament pack', 'name-derived'];
  if (/\btins?\b/i.test(name)) return ['Tin', 'name-derived'];
  if (/collection|legendary decks/i.test(name)) return ['Collection', 'name-derived'];
  if (/promo/i.test(name)) return ['Promotion', 'name-derived'];
  return ['Unclassified', 'unknown'];
}
/** Calendar periods are display groups, not claimed Konami series. */
export function displayEra(releaseDate?: string) {
  if (!releaseDate) return 'Undated';
  const year = Number(releaseDate.slice(0, 4));
  if (year >= 2002 && year <= 2004) return '2002–2004 · Early TCG';
  const start = Math.floor(year / 5) * 5;
  return `${start}–${start + 4}`;
}
export function normalizeCatalog(raw: unknown, format: YugiohFormat = 'TCG'): YugiohCatalogSet[] {
  if (!Array.isArray(raw)) throw new Error('Invalid Yu-Gi-Oh! catalog response');
  const sets = new Map<string, YugiohCatalogSet>();
  for (const record of raw) {
    if (!record || typeof record !== 'object') continue;
    const name = text(record.set_name); if (!name) continue;
    const code = text(record.set_code)?.toUpperCase();
    const releaseDate = date(format === 'TCG' ? record.tcg_date : record.ocg_date);
    // Code + date keeps dated reissues and same-code tin waves apart. Without a
    // date, retain the name as a discriminator instead of merging blindly.
    const id = `ygoprodeck:${format}:${code ?? 'uncoded'}:${releaseDate && code ? releaseDate : encodeURIComponent(name.toLowerCase())}`;
    const [productFamily, groupingBasis] = family(name, code), implementation = implementationFor(id);
    const cardCount = Number.isInteger(record.num_of_cards) && record.num_of_cards > 0 ? record.num_of_cards : undefined;
    const entry: YugiohCatalogSet = { id, name, aliases: [], setCode: code, releaseDate, cardCount, format,
      productFamily, groupingBasis, era: displayEra(releaseDate),
      implementationId: implementation?.id, implementationStatus: implementation?.status ?? 'browse-only', source: CATALOG_ENDPOINT };
    const existing = sets.get(id);
    if (!existing) sets.set(id, entry);
    else {
      const names = [...new Set([existing.name, ...existing.aliases, name])].sort();
      existing.name = names[0]; existing.aliases = names.slice(1);
      existing.cardCount = Math.max(existing.cardCount ?? 0, cardCount ?? 0) || undefined;
      if (groupingBasis === 'curated') { existing.productFamily = productFamily; existing.groupingBasis = groupingBasis; }
    }
  }
  return [...sets.values()].sort((a, b) => a.id.localeCompare(b.id));
}
export interface CatalogQuery { search: string; format: YugiohFormat | 'all'; era: string; family: string; sort: 'newest' | 'oldest' | 'alphabetical' }
export function queryCatalog(sets: readonly YugiohCatalogSet[], query: CatalogQuery) {
  const search = query.search.trim().toLocaleLowerCase();
  return sets.filter(s => (query.format === 'all' || s.format === query.format) && (!query.era || s.era === query.era) &&
    (!query.family || s.productFamily === query.family) && [s.name, s.setCode ?? '', ...s.aliases].some(v => v.toLocaleLowerCase().includes(search)))
    .sort((a, b) => {
      if (query.sort === 'alphabetical') return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
      if (!a.releaseDate || !b.releaseDate) return Number(!a.releaseDate) - Number(!b.releaseDate) || a.name.localeCompare(b.name);
      return (query.sort === 'newest' ? -1 : 1) * a.releaseDate.localeCompare(b.releaseDate) || a.name.localeCompare(b.name);
    });
}
interface Snapshot { version: 1; fetchedAt: string; records: unknown[] }
export interface CatalogResult { sets: YugiohCatalogSet[]; source: 'network' | 'cache' | 'bundled'; fetchedAt: string; stale: boolean }
export interface CatalogStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
/** Injected boundaries make offline, abort, corrupt-cache and provider tests network-free. */
export class YugiohCatalogProvider {
  private memory?: Snapshot;
  private fetcher: typeof fetch;
  private storage?: CatalogStorage;
  private bundledUrl: string;
  private now: () => number;
  constructor(fetcher: typeof fetch = fetch, storage?: CatalogStorage, bundledUrl = '/catalog/yugioh/sets.json', now = () => Date.now()) {
    this.fetcher = fetcher; this.storage = storage; this.bundledUrl = bundledUrl; this.now = now;
  }
  private snapshot(value: unknown): Snapshot | undefined {
    if (!value || typeof value !== 'object') return;
    const s = value as Snapshot;
    if (s.version !== 1 || !Number.isFinite(Date.parse(s.fetchedAt)) || !Array.isArray(s.records) || !normalizeCatalog(s.records).length) return;
    return s;
  }
  async sets(signal: AbortSignal, refresh = false): Promise<CatalogResult> {
    signal.throwIfAborted();
    let cached = this.memory;
    if (!cached) try { cached = this.snapshot(JSON.parse(this.storage?.getItem(CACHE_KEY) ?? 'null')); } catch { /* storage unavailable/corrupt */ }
    const result = (snapshot: Snapshot, source: CatalogResult['source']): CatalogResult => ({ sets: normalizeCatalog(snapshot.records), source,
      fetchedAt: snapshot.fetchedAt, stale: this.now() - Date.parse(snapshot.fetchedAt) >= MAX_AGE });
    if (cached && !refresh && !result(cached, 'cache').stale) return result(cached, 'cache');
    try {
      const response = await this.fetcher(CATALOG_ENDPOINT, { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) });
      if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
      const records: unknown = await response.json(); signal.throwIfAborted();
      const snapshot = this.snapshot({ version: 1, fetchedAt: new Date(this.now()).toISOString(), records });
      if (!snapshot) throw new Error('Catalog has no valid records');
      this.memory = snapshot;
      try { this.storage?.setItem(CACHE_KEY, JSON.stringify(snapshot)); } catch { /* quota/private mode: retain memory */ }
      return result(snapshot, 'network');
    } catch (error) {
      signal.throwIfAborted();
      if (cached) return result(cached, 'cache');
      const response = await this.fetcher(this.bundledUrl, { signal });
      if (!response.ok) throw error;
      const snapshot = this.snapshot(await response.json()); signal.throwIfAborted();
      if (!snapshot) throw new Error('Bundled Yu-Gi-Oh! catalog is unavailable');
      this.memory = snapshot;
      return result(snapshot, 'bundled');
    }
  }
}
