import { celebrationRecords } from './data/30th.generated.ts';
import type { PokemonCard, PokemonSet } from './types.ts';
import { localBoosterArt } from './boosterArt.ts';

export const CELEBRATION_ID = '30th';
export const CELEBRATION_UPC_ID = '30th-classic-upc';
export const celebrationCards: readonly PokemonCard[] = celebrationRecords.map(record => ({
  ...record, variants: ['holo'], types: [...record.types], foil: { ...record.foil },
}));
const byId = new Map(celebrationCards.map(card => [card.id, card]));
export const isCelebrationCard = (id: string) => byId.has(id);
export const celebrationClassicIds = celebrationCards.filter(card => card.setId === '30th-classic').map(card => card.id);
export const celebrationSet: PokemonSet = {
  id: CELEBRATION_ID, name: '30th Celebration', series: { id: 'me', name: 'Mega Evolution' },
  era: 'me', releaseDate: '2026-09-16', cardIds: celebrationCards.map(card => card.id),
  boosters: localBoosterArt(CELEBRATION_ID)!,
};
export const celebrationUpcSet: PokemonSet = {
  ...celebrationSet, id: CELEBRATION_UPC_ID, name: '30th Celebration · UPC Classic Collection',
  releaseDate: '2026-11-06', cardIds: celebrationClassicIds, boosters: localBoosterArt(CELEBRATION_UPC_ID)!,
};
export const isCelebrationSet = (id: string) => id === CELEBRATION_ID || id === CELEBRATION_UPC_ID;
export function celebrationProduct(id: string): PokemonSet {
  const set = id === CELEBRATION_ID ? celebrationSet : id === CELEBRATION_UPC_ID ? celebrationUpcSet : undefined;
  if (!set) throw new Error(`Unknown anniversary product: ${id}`);
  return { ...set, series: { ...set.series }, cardIds: [...set.cardIds], boosters: set.boosters.map(booster => ({ ...booster })) };
}
export function celebrationCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown anniversary printing: ${id}`);
  return { ...card, variants: [...card.variants], types: card.types ? [...card.types] : undefined, foil: { ...card.foil } };
}
