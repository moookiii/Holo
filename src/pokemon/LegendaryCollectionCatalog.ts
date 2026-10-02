import { localBoosterArt } from './boosterArt.ts';
import { legendaryCollectionRecords } from './data/legendary-collection.generated.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const LEGENDARY_COLLECTION_ID = 'lc';
/** The 110 numbered English unlimited retail cards. Theme-deck-only nonholos are separate products. */
export const legendaryCollectionCards: readonly PokemonCard[] = legendaryCollectionRecords.map(record => {
  const holo = Number(record.localId) <= 19;
  return {
    ...record, setId: LEGENDARY_COLLECTION_ID, setName: 'Legendary Collection',
    seriesId: 'lc', seriesName: 'Legendary Collection', era: 'lc',
    rarity: holo ? 'Holo Rare' : record.rarity,
    variants: holo ? ['holo', 'reverse'] : ['normal', 'reverse'],
    boosterIds: ['starters', 'eeveelutions', 'birds', 'mewtwo'],
    front: `/cards/pokemon/legendary-collection/${record.front}`,
    thumbnail: `/cards/pokemon/legendary-collection/${record.front}`,
  } satisfies PokemonCard;
});
export const legendaryCollectionSet: PokemonSet = {
  id: LEGENDARY_COLLECTION_ID, name: 'Legendary Collection',
  series: { id: 'lc', name: 'Legendary Collection' }, era: 'lc', releaseDate: '2002-05-24',
  logo: '/packs/pokemon/lc-logo.png', symbol: '/packs/pokemon/lc-symbol.png',
  cardIds: legendaryCollectionCards.map(card => card.id),
  boosters: localBoosterArt(LEGENDARY_COLLECTION_ID)!,
};
const byId = new Map(legendaryCollectionCards.map(card => [card.id, card]));
export function legendaryCollectionCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Legendary Collection card: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [...card.boosterIds!], ...(card.types ? { types: [...card.types] } : {}) };
}
