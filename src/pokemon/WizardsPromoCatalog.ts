import { wizardsMoviePromoRecords } from './data/wizards-movie-promos.generated.ts';
import { wizardsPromoRecords } from './data/wizards-promos.generated.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

const ancientMewPromo: PokemonCard = {
  id: 'basep-53', localId: '53', name: 'Ancient Mew',
  setId: 'basep', setName: 'Wizards Black Star Promos',
  seriesId: 'base', seriesName: 'Base', era: 'base', rarity: 'Promo',
  category: 'Pokemon', stage: 'Basic', types: ['Psychic'],
  variants: ['holo'], boosterIds: [],
  front: '/cards/ancient-mew/front.jpeg', thumbnail: '/cards/ancient-mew/front.jpeg',
};

export const WIZARDS_PROMO_ID = 'basep';
export const WIZARDS_PROMO_ASSETS = '/cards/pokemon/wizards-promos';

/** Phase 1's numbered ordinary prints. Further finishes belong in separate subsets. */
export const wizardsOrdinaryPromoCards: readonly PokemonCard[] = wizardsPromoRecords.map(record => ({
  ...record,
  setId: WIZARDS_PROMO_ID, setName: 'Wizards Black Star Promos',
  seriesId: 'base', seriesName: 'Base', era: 'base', rarity: 'Promo',
  variants: ['normal'], boosterIds: [],
  front: `${WIZARDS_PROMO_ASSETS}/${record.front}`,
  thumbnail: `${WIZARDS_PROMO_ASSETS}/${record.front}`,
}));

/** Numbered movie distribution, kept separate from the ordinary print subset. */
export const wizardsMoviePromoCards: readonly PokemonCard[] = wizardsMoviePromoRecords.map(record => ({
  ...record, types: [...record.types],
  setId: WIZARDS_PROMO_ID, setName: 'Wizards Black Star Promos',
  seriesId: 'base', seriesName: 'Base', era: 'base', rarity: 'Promo',
  variants: ['normal'], boosterIds: [],
  front: `${WIZARDS_PROMO_ASSETS}/${record.front}`,
  thumbnail: `${WIZARDS_PROMO_ASSETS}/${record.front}`,
}));
export const wizardsMoviePromoIds = new Set(wizardsMoviePromoCards.map(card => card.id));
export const wizardsPromoCards: readonly PokemonCard[] = [...wizardsOrdinaryPromoCards, ...wizardsMoviePromoCards, ancientMewPromo]
  .sort((a, b) => Number(a.localId) - Number(b.localId));

export const wizardsPromoSet: PokemonSet = {
  id: WIZARDS_PROMO_ID, name: 'Wizards Black Star Promos',
  series: { id: 'base', name: 'Base' }, era: 'base', releaseDate: '1999-07-01',
  cardIds: wizardsPromoCards.map(card => card.id), boosters: [],
};

const byId = new Map(wizardsPromoCards.map(card => [card.id, card]));
export function wizardsPromoCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Wizards Black Star Promo: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [], ...(card.types ? { types: [...card.types] } : {}) };
}
