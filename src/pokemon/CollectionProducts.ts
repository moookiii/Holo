import { SOUTHERN_ISLANDS_ID, southernIslandsCards } from './SouthernIslandsCatalog.ts';
import { SAMPLE_SET_ID, sampleSetCards } from './SampleSetCatalog.ts';
import type { PokemonCard } from './types.ts';

export interface PokemonCollectionProduct {
  id: string; setId: string; name: string; kind: 'collection-folder' | 'demonstration-collection';
  artwork: string; cardIds: readonly string[]; note: string;
}
/** Fixed products deliberately have no booster recipe, seed, or rarity pools. */
export const pokemonCollectionProducts: readonly PokemonCollectionProduct[] = [{
  id: 'southern-islands-english-collection', setId: SOUTHERN_ISLANDS_ID, kind: 'collection-folder',
  name: 'Southern Islands Collection', artwork: '/packs/pokemon/si1-folder.png',
  cardIds: southernIslandsCards.map(c => c.id),
  note: '18 fixed English promo cards · 6 Cosmos reverse holos + 12 non-holos. The original binder also included six postcards, sleeves, and three boosters from other expansions; this folder opens the complete Southern Islands card collection.',
}, {
  id: 'sample-set-new-york-demonstration', setId: SAMPLE_SET_ID, kind: 'demonstration-collection',
  name: 'e-Card Sample Set · New York demonstration', artwork: '/cards/pokemon/sample-set/symbol.png',
  cardIds: sampleSetCards.map(card => card.id),
  note: 'August 2002 · Pokémon Center New York · 10 non-holo Pokémon samples. Open the complete demonstration checklist. No retail booster or sealed ten-card package is established; packaging and participant allocation are unknown. Checklist order is used for browsing.',
}];
export const collectionProductFor = (setId: string) => pokemonCollectionProducts.find(p => p.setId === setId);
export function resolvePokemonCollection(product: PokemonCollectionProduct, cards: readonly PokemonCard[]): readonly PokemonCard[] {
  if (new Set(product.cardIds).size !== product.cardIds.length) throw new Error('Duplicate fixed collection card IDs');
  const pool = cards.filter(c => c.setId === product.setId);
  if (pool.length !== product.cardIds.length || new Set(pool.map(c => c.id)).size !== pool.length)
    throw new Error('Incomplete fixed collection metadata');
  return Object.freeze(product.cardIds.map(id => {
    const card = pool.find(c => c.id === id);
    if (!card || card.variants.length !== 1) throw new Error(`Missing fixed printing for ${id}`);
    return Object.freeze({ ...card, variants: [...card.variants] });
  }));
}
