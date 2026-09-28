import { localBoosterArt } from './boosterArt.ts';
import { baseSet2Records } from './data/base-set-2.generated.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const BASE_SET_2_ID = 'base4';
/** English unlimited retail checklist. No first edition, reverse or W-stamp prints. */
export const baseSet2Cards: readonly PokemonCard[] = baseSet2Records.map(record => ({
  ...record, setId: BASE_SET_2_ID, setName: 'Base Set 2', seriesId: 'base', seriesName: 'Base', era: 'base',
  rarity: Number(record.localId) <= 20 ? 'Holo Rare' : record.rarity,
  variants: [Number(record.localId) <= 20 ? 'holo' : 'normal'],
  boosterIds: ['mewtwo', 'pidgeot', 'raichu', 'gyarados'],
  front: `/cards/pokemon/base-set-2/${record.front}`, thumbnail: `/cards/pokemon/base-set-2/${record.front}`,
}));
export const baseSet2Set: PokemonSet = {
  id: BASE_SET_2_ID, name: 'Base Set 2', series: { id: 'base', name: 'Base' }, era: 'base', releaseDate: '2000-02-24',
  logo: '/packs/pokemon/base4-logo.png', cardIds: baseSet2Cards.map(card => card.id), boosters: localBoosterArt(BASE_SET_2_ID)!,
};
const byId = new Map(baseSet2Cards.map(card => [card.id, card]));
export function baseSet2Card(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Base Set 2 card: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [...card.boosterIds!], ...(card.types ? { types: [...card.types] } : {}) };
}
