import type { PokemonBooster, PokemonSet } from '../pokemon/types';
import type { YugiohCatalogSet } from '../yugioh/types';

export interface VendingArtwork { id: string; name: string; front?: string; frontBounds?: [number, number, number, number] }
export type VendingSelection =
  | { game: 'pokemon'; set: PokemonSet; artwork: PokemonBooster }
  | { game: 'yugioh'; set: YugiohCatalogSet; productId: string }
  | { game: 'magic'; productId: string };
export interface VendingProduct {
  id: string; name: string; era: string; year?: string; size?: number; packSize?: number;
  available: boolean; note?: string; artwork: VendingArtwork[];
  selection?: (artworkId: string) => VendingSelection;
}
export interface VendingGame {
  id: string; name: string;
  eras(signal: AbortSignal): Promise<{ id: string; name: string }[]>;
  products(era: string, signal: AbortSignal): Promise<VendingProduct[]>;
  detail(product: VendingProduct, signal: AbortSignal): Promise<VendingProduct>;
}

export function filterProducts(products: readonly VendingProduct[], search: string, availability: string) {
  const query = search.trim().toLocaleLowerCase();
  return products.filter(p => p.name.toLocaleLowerCase().includes(query) &&
    (availability === 'all' || p.available === (availability === 'openable')));
}

/** Resolve Random only on dispense, and only among the actual product's wrappers. */
export function selectArtwork(product: VendingProduct, id: string, random = Math.random) {
  if (!product.available || !product.selection || !product.artwork.length) throw new Error('This set is browse only.');
  const artwork = id === 'random' ? product.artwork[Math.min(product.artwork.length - 1, Math.floor(random() * product.artwork.length))]
    : product.artwork.find(a => a.id === id);
  if (!artwork) throw new Error('This booster artwork is unavailable.');
  return product.selection(artwork.id);
}
