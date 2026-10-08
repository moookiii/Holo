import { tcglSvSets } from './data/sv-tcgl.generated.ts';
import type { PokemonCard, PokemonSet } from './types.ts';
import { localBoosterArt } from './boosterArt.ts';

const records = new Map(tcglSvSets.map(set => [set.id, set]));
export const isSvTcglSet = (id: string): boolean => records.has(id);
export const svTcglCards: readonly PokemonCard[] = tcglSvSets.flatMap(set => set.cards.map(card => ({
  ...card, setId: set.id, setName: set.name, seriesId: 'sv', seriesName: 'Scarlet & Violet', era: 'sv',
  variants: [...card.variants], types: card.types ? [...card.types] : undefined, foil: { ...card.foil },
  front: `${set.assets}/${card.front}`, thumbnail: `${set.assets}/${card.front}`,
})));
const byId = new Map(svTcglCards.map(card => [card.id, card]));
export const svTcglSets: readonly PokemonSet[] = tcglSvSets.map(set => ({
  id: set.id, name: set.name, logo: set.logo ?? undefined, releaseDate: set.releaseDate,
  series: { id: 'sv', name: 'Scarlet & Violet' }, era: 'sv',
  cardIds: set.cards.map(card => card.id), boosters: localBoosterArt(set.id) ?? [],
}));
export function svTcglSet(id: string): PokemonSet {
  const set = svTcglSets.find(set => set.id === id);
  if (!set) throw new Error(`Unknown TCGL set: ${id}`);
  return { ...set, series: { ...set.series }, cardIds: [...set.cardIds], boosters: set.boosters.map(b => ({ ...b })) };
}
export function svTcglCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown TCGL card: ${id}`);
  return { ...card, variants: [...card.variants], types: card.types ? [...card.types] : undefined, foil: { ...card.foil } };
}
export function svTcglCollectorNumber(id: string): string {
  const card = svTcglCard(id);
  return records.get(card.setId)!.cards.find(record => record.id === id)!.collectorNumber;
}
/** A reverse or promotional printing can have different printed TCGL art. */
export function svTcglFront(id: string, variant: import('./types.ts').PrintVariant): string {
  const card = svTcglCard(id), set = records.get(card.setId)!;
  const record = set.cards.find(record => record.id === id)!;
  return `${set.assets}/${record.variantFronts?.[variant] ?? record.front}`;
}
