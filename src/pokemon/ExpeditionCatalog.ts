import { localBoosterArt } from './boosterArt.ts';
import { expeditionRecords } from './data/expedition.generated.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const EXPEDITION_ID = 'ecard1';
/** Numbered English retail prints; jumbo box toppers and E3 promos are excluded. */
export const expeditionCards: readonly PokemonCard[] = expeditionRecords.map(record => {
  const number = Number(record.localId);
  return { ...record, setId: EXPEDITION_ID, setName: 'Expedition Base Set',
    seriesId: 'ecard', seriesName: 'E-Card', era: 'ecard',
    variants: number <= 32 ? ['holo', 'reverse'] : number <= 159 ? ['normal', 'reverse'] : ['normal'],
    boosterIds: ['venusaur', 'charizard', 'blastoise', 'feraligatr'],
    front: `/cards/pokemon/expedition/${record.front}`,
    thumbnail: `/cards/pokemon/expedition/thumbnails/${record.localId}.webp`,
  } satisfies PokemonCard;
});
export const expeditionSet: PokemonSet = {
  id: EXPEDITION_ID, name: 'Expedition Base Set',
  series: { id: 'ecard', name: 'E-Card' }, era: 'ecard', releaseDate: '2002-09-15',
  logo: '/packs/pokemon/ecard1-logo.png', symbol: '/packs/pokemon/ecard1-symbol.png',
  cardIds: expeditionCards.map(card => card.id), boosters: localBoosterArt(EXPEDITION_ID)!,
};
const byId = new Map(expeditionCards.map(card => [card.id, card]));
export function expeditionCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Expedition card: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [...card.boosterIds!],
    ...(card.types ? { types: [...card.types] } : {}) };
}
