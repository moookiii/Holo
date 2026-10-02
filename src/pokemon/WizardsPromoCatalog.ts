import { wizardsPromoRecords } from './data/wizards-promos.generated.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const WIZARDS_PROMO_ID = 'basep';
export const WIZARDS_PROMO_ASSETS = '/cards/pokemon/wizards-promos';

/** Phase 1's numbered ordinary prints. Further finishes belong in separate subsets. */
export const wizardsPromoCards: readonly PokemonCard[] = wizardsPromoRecords.map(record => ({
  ...record,
  setId: WIZARDS_PROMO_ID, setName: 'Wizards Black Star Promos',
  seriesId: 'base', seriesName: 'Base', era: 'base', rarity: 'Promo',
  variants: ['normal'], boosterIds: [],
  front: `${WIZARDS_PROMO_ASSETS}/${record.front}`,
  thumbnail: `${WIZARDS_PROMO_ASSETS}/${record.front}`,
}));

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
