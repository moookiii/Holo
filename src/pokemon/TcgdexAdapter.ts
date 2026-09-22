import TCGdex from '@tcgdex/sdk';
import type { CatalogEntry, PokemonCard, PokemonSet, PrintVariant } from './types.ts';
import { boundedMap, pause } from './requests.ts';
import { localBoosterArt } from './boosterArt.ts';

// SDK 2.9 exposes transport injection but no per-call AbortSignal. Endpoint.get
// invokes the transport synchronously, before its first await. Capture the signal
// here (never read ambient state after an await); concurrent requests stay isolated.
let requestSignal: AbortSignal | undefined;
TCGdex.fetch = async (url, init) => {
  const signal = requestSignal ?? new AbortController().signal;
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    try {
      const response = await fetch(url, { ...init, headers: { Accept: 'application/json' }, signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
      if (response.ok) return response;
      if (response.status !== 429 && response.status < 500) throw new PermanentCatalogError(`TCGdex request failed (${response.status}).`);
      if (attempt === 2) throw new PermanentCatalogError('TCGdex is temporarily unavailable. Please retry.');
    } catch (error) {
      if (signal.aborted || error instanceof PermanentCatalogError || attempt === 2) throw error;
    }
    await pause(350 * 2 ** attempt, signal);
  }
};
class PermanentCatalogError extends Error {}
const client = new TCGdex('en');
const image = (path?: string) => path ? /\.(png|webp|jpe?g)$/i.test(path) ? path : `${path}.webp` : undefined;
const titleCase = (value: string) => value.replace(/\b\w/g, c => c.toUpperCase());

export class TcgdexAdapter {
  private cache = new Map<string, unknown>();
  private async read<T>(key: string, signal: AbortSignal, run: () => Promise<T>): Promise<T> {
    signal.throwIfAborted();
    if (this.cache.has(key)) return this.cache.get(key) as T;
    let pending: Promise<T>;
    requestSignal = signal;
    try { pending = run(); } finally { requestSignal = undefined; }
    const value = await pending;
    signal.throwIfAborted(); this.cache.set(key, value); return value;
  }
  series(signal: AbortSignal): Promise<CatalogEntry[]> {
    return this.read('series', signal, async () => {
      const entries = await client.serie.list();
      if (!entries.length) throw new Error('No Pokémon series are available.');
      return entries.map(s => ({ id: s.id, name: s.name, logo: image(s.logo) }));
    });
  }
  sets(seriesId: string, signal: AbortSignal): Promise<CatalogEntry[]> {
    return this.read(`series:${seriesId}`, signal, async () => {
      const serie = await client.serie.get(seriesId);
      if (!serie) throw new Error('This series is unavailable.');
      return serie.sets.map(s => ({ id: s.id, name: s.name, logo: image(s.logo) }));
    });
  }
  set(id: string, signal: AbortSignal): Promise<PokemonSet> {
    return this.read(`set:${id}`, signal, async () => {
      const set = await client.set.get(id);
      if (!set) throw new Error('This set is unavailable.');
      return { id: set.id, name: set.name, logo: image(set.logo), series: { id: set.serie.id, name: set.serie.name },
        era: set.serie.id, releaseDate: set.releaseDate, cardIds: set.cards.map(c => c.id),
        boosters: set.boosters?.length ? set.boosters.map(b => ({ id: b.id, name: b.name, logo: image(b.logo), front: image(b.artwork_front), back: image(b.artwork_back) }))
          : localBoosterArt(set.id) ?? [{ id: 'standard', name: 'Standard booster' }] };
    });
  }
  card(id: string, set: PokemonSet, signal: AbortSignal): Promise<PokemonCard> {
    return this.read(`card:${id}`, signal, async () => {
      const card = await client.card.get(id);
      if (!card || card.set.id !== set.id) throw new Error(`Card metadata unavailable: ${id}. Retry to keep the complete pool.`);
      const variants: PrintVariant[] = ['normal', 'reverse', 'holo'].filter(v => card.variants?.[v as PrintVariant]) as PrintVariant[];
      const foil: PokemonCard['foil'] = {};
      // Exclude promotional stamps/oversize/reprint foils from retail eligibility.
      for (const v of card.variantsDetailed ?? []) {
        if ((v.size && v.size !== 'standard') || v.stamp?.length || v.subtype) continue;
        if (!['normal', 'reverse', 'holo'].includes(v.type)) continue;
        const type = v.type as PrintVariant;
        if (!variants.includes(type)) variants.push(type);
        if (v.foil && !foil[type]) foil[type] = v.foil;
        if (!v.foil) foil[type] = ''; // Ordinary printing takes precedence over e.g. tin Cosmos.
      }
      if (!variants.length) throw new Error(`Print variants missing for ${id}.`);
      return { id: card.id, localId: card.localId, name: card.name, setId: set.id, setName: set.name,
        seriesId: set.series.id, seriesName: set.series.name, era: set.era, rarity: titleCase(card.rarity), category: card.category, variants, foil, evolveFrom: card.evolveFrom,
        boosterIds: card.boosters?.map(b => b.id), front: card.image ? card.getImageURL('high', 'png') : undefined,
        thumbnail: card.image ? card.getImageURL('low', 'webp') : undefined };
    });
  }
  cards(set: PokemonSet, signal: AbortSignal, progress: (done: number, total: number) => void = () => {}) {
    let done = 0;
    return boundedMap(set.cardIds, 6, signal, async id => {
      const card = await this.card(id, set, signal); progress(++done, set.cardIds.length); return card;
    });
  }
}
export const pokemonCatalog = new TcgdexAdapter();
