import { southernIslandsRecords, southernIslandsSetId } from './data/southern-islands.generated.ts';
import type { PokemonCard, PokemonSet, PrintVariant } from './types.ts';

/** ID resolved by the fetch script from TCGdex's set listing, then snapshotted. */
export const SOUTHERN_ISLANDS_ID = southernIslandsSetId;
export const southernIslandsCards: readonly PokemonCard[] = southernIslandsRecords.map(record => {
  const variants: PrintVariant[] = record.variants.reverse ? ['reverse'] : ['normal'];
  const front = `/cards/pokemon/southern-islands/${record.front}`;
  return { ...record, variants, front, thumbnail: front, setId: SOUTHERN_ISLANDS_ID, setName: 'Southern Islands',
    seriesId: 'neo', seriesName: 'Neo', era: 'neo', boosterIds: [],
    foil: record.variants.reverse ? { reverse: 'WotC exterior Cosmos' } : undefined };
});
export const southernIslandsSet: PokemonSet = {
  id: SOUTHERN_ISLANDS_ID, name: 'Southern Islands', series: { id: 'neo', name: 'Neo' }, era: 'neo',
  releaseDate: '2001-07-31', cardIds: southernIslandsCards.map(c => c.id), boosters: [],
  logo: '/packs/pokemon/si1-logo.png',
};
const byId = new Map(southernIslandsCards.map(c => [c.id, c]));
export function southernIslandsCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Southern Islands card: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [], foil: { ...card.foil }, ...(card.types ? { types: [...card.types] } : {}) };
}
