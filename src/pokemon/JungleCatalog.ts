import { jungleRecords } from './data/jungle.generated.ts';
import { localBoosterArt } from './boosterArt.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const JUNGLE_SET_ID = 'base2';
export const JUNGLE_ASSETS = '/cards/pokemon/jungle';
/** The numbered English retail prints: 1–16 holo, 17–32 non-holo rare.
 * No-symbol errors, prerelease stamps and W promos are not retail variants.
 */
export const jungleCards: readonly PokemonCard[] = jungleRecords.map(record => {
  const number = Number(record.localId);
  return { ...record, setId: JUNGLE_SET_ID, setName: 'Jungle', seriesId: 'base', seriesName: 'Base', era: 'base',
    rarity: number <= 16 ? 'Holo Rare' : record.rarity,
    variants: [number <= 16 ? 'holo' : 'normal'],
    boosterIds: ['flareon', 'scyther', 'wigglytuff'],
    front: `${JUNGLE_ASSETS}/${record.front}`, thumbnail: `${JUNGLE_ASSETS}/${record.front}` };
});
export const jungleSet: PokemonSet = {
  id: JUNGLE_SET_ID, name: 'Jungle', series: { id: 'base', name: 'Base' }, era: 'base', releaseDate: '1999-06-16',
  logo: '/packs/pokemon/base2-logo.png', cardIds: jungleCards.map(card => card.id), boosters: localBoosterArt(JUNGLE_SET_ID)!,
};
const byId = new Map(jungleCards.map(card => [card.id, card]));
export function jungleCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Jungle card: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [...card.boosterIds!], types: card.types ? [...card.types] : undefined };
}
