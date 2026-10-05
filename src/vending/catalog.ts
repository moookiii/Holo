import { pokemonCatalog } from '../pokemon/TcgdexAdapter';
import { localBoosterArt } from '../pokemon/boosterArt';
import { packAvailability } from '../pokemon/availability';
import { recipeFor } from '../pokemon/recipes';
import { boundedMap } from '../pokemon/requests';
import { YugiohCatalogProvider } from '../yugioh/catalog/provider';
import { implementationFor } from '../yugioh/catalog/implementations';
import { magicSets } from '../magic/AlphaCatalog';
import { magicProducts, alphaArtwork } from '../magic/products';
import type { VendingGame, VendingProduct } from './types';

const base = import.meta.env.BASE_URL;
let storage: Storage | undefined;
try { storage = localStorage; } catch { /* Storage is optional. */ }
const yugioh = new YugiohCatalogProvider(fetch, storage, `${base}catalog/yugioh/sets.json`);
const pokemonAvailable = (id: string) => !!recipeFor(id) && packAvailability(id).ready;
const pokemon: VendingGame = {
  id: 'pokemon', name: 'Pokémon',
  eras: async signal => (await pokemonCatalog.series(signal)).sort((a, b) => Number(a.id === 'misc') - Number(b.id === 'misc')),
  async products(era, signal) {
    const eras = era ? [{ id: era, name: era }] : await this.eras(signal);
    const groups = await boundedMap(eras, 3, signal, async entry =>
      (await pokemonCatalog.sets(entry.id, signal)).map(set => ({ id: set.id, name: set.name, era: entry.id,
        available: pokemonAvailable(set.id), artwork: localBoosterArt(set.id) ?? [] })));
    return [...new Map(groups.flat().map(p => [p.id, p])).values()];
  },
  async detail(product, signal) {
    const set = await pokemonCatalog.set(product.id, signal), recipe = recipeFor(set.id);
    return { ...product, year: set.releaseDate?.slice(0, 4), era: set.series.name, size: set.cardIds.length,
      packSize: recipe?.slots.reduce((n, slot) => n + slot.count, 0), note: packAvailability(set.id).detail,
      available: pokemonAvailable(set.id) && set.boosters.length > 0, artwork: set.boosters,
      selection: id => ({ game: 'pokemon', set, artwork: set.boosters.find(a => a.id === id)! }) };
  },
};
const ygo: VendingGame = {
  id: 'yugioh', name: 'Yu-Gi-Oh!',
  async eras(signal) {
    const { sets } = await yugioh.sets(signal);
    return [...new Set(sets.map(s => s.era))].sort().map(id => ({ id, name: id }));
  },
  async products(era, signal) {
    const { sets } = await yugioh.sets(signal);
    return sets.filter(s => !era || s.era === era).sort((a, b) => (a.releaseDate ?? '9999').localeCompare(b.releaseDate ?? '9999'))
      .map(set => {
        const implementation = implementationFor(set.id);
        return { id: set.id, name: set.name, era: set.era, year: set.releaseDate?.slice(0, 4), size: set.cardCount,
          available: implementation?.status === 'implemented', artwork: implementation ? [{ id: implementation.id,
            name: '1st Edition', front: `${base}packs/yugioh/lob-first-edition/front.png` }] : [],
          selection: implementation ? () => ({ game: 'yugioh', set, productId: implementation.id }) : undefined };
      });
  },
  async detail(product, signal) {
    signal.throwIfAborted();
    if (!product.available) return { ...product, note: 'Catalog entry only. This product has no implemented opening in Holo.' };
    const { lobProduct } = await import('../yugioh/sets/LegendOfBlueEyesProduct');
    signal.throwIfAborted();
    return { ...product, packSize: lobProduct.packSize, note: lobProduct.rules.note };
  },
};
const magic: VendingGame = {
  id: 'magic', name: 'Magic',
  async eras() { return [...new Map(magicSets.map(s => [s.series.id, s.series])).values()]; },
  async products(era) {
    return magicSets.filter(s => !era || s.series.id === era).map(set => {
      const products = magicProducts.filter(p => set.productIds.includes(p.id));
      return { id: set.id, name: set.name, era: set.series.name, year: set.releaseDate.slice(0, 4), size: set.cards.length,
        packSize: products[0]?.packSize, available: products.length > 0, note: products[0]?.note,
        artwork: products.map(p => ({ id: p.id, name: 'Original booster', front: `${base}${alphaArtwork.replace(/^\//, '')}` })),
        selection: productId => ({ game: 'magic', productId }) };
    });
  },
  async detail(product) { return product; },
};
export const vendingGames: VendingGame[] = [pokemon, ygo, magic];
