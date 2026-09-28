import { localBoosterArt } from './boosterArt.ts';
import { fossilRecords } from './data/fossil.generated.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const FOSSIL_SET_ID = 'base3';
export const FOSSIL_ASSETS = '/cards/pokemon/fossil';
/** English retail prints: 1-15 holo and 16-30 separate non-holo rares.
 * Prerelease stamps and promotional printings are excluded.
 */
export const fossilCards: readonly PokemonCard[] = fossilRecords.map(record => {
  const number = Number(record.localId);
  return { ...record, setId: FOSSIL_SET_ID, setName: 'Fossil', seriesId: 'base', seriesName: 'Base', era: 'base',
    rarity: number <= 15 ? 'Holo Rare' : record.rarity,
    variants: [number <= 15 ? 'holo' : 'normal'],
    boosterIds: ['lapras', 'aerodactyl', 'zapdos'],
    front: `${FOSSIL_ASSETS}/${record.front}`, thumbnail: `${FOSSIL_ASSETS}/${record.front}` };
});
export const fossilSet: PokemonSet = {
  id: FOSSIL_SET_ID, name: 'Fossil', series: { id: 'base', name: 'Base' }, era: 'base', releaseDate: '1999-10-10',
  logo: '/packs/pokemon/base3-logo.png', cardIds: fossilCards.map(card => card.id), boosters: localBoosterArt(FOSSIL_SET_ID)!,
};
const byId = new Map(fossilCards.map(card => [card.id, card]));
export function fossilCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Fossil card: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [...card.boosterIds!], ...(card.types ? { types: [...card.types] } : {}) };
}
