import { localBoosterArt } from './boosterArt.ts';
import { gymChallengeRecords } from './data/gym-challenge.generated.ts';
import { gymChallengeWrapper } from './GymChallengeProduct.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const GYM_CHALLENGE_ID = 'gym2';
export const gymChallengeCards: readonly PokemonCard[] = gymChallengeRecords.map(record => {
  const n = Number(record.localId), holo = n <= 20;
  const editionFronts = {
    'first-edition': `/cards/pokemon/gym-challenge/${record.localId === '107' ? '107-first-edition.png' : record.front}`,
  };
  return { ...record, setId: GYM_CHALLENGE_ID, setName: 'Gym Challenge', seriesId: 'gym', seriesName: 'Gym', era: 'gym',
    rarity: holo ? 'Holo Rare' : record.rarity,
    variants: [holo ? 'holo' : 'normal'], edition: 'first-edition', editionFronts,
    boosterIds: gymChallengeWrapper.designs.map(d => d.id),
    front: editionFronts['first-edition'], thumbnail: editionFronts['first-edition'] };
});
export const gymChallengeSet: PokemonSet = {
  id: GYM_CHALLENGE_ID, name: 'Gym Challenge', series: { id: 'gym', name: 'Gym' }, era: 'gym', releaseDate: '2000-10-16',
  logo: '/packs/pokemon/gym2-logo.png', cardIds: gymChallengeCards.map(c => c.id), boosters: localBoosterArt(GYM_CHALLENGE_ID)!,
};
const byId = new Map(gymChallengeCards.map(c => [c.id, c]));
export function gymChallengeCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Gym Challenge card: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [...card.boosterIds!], editionFronts: { ...card.editionFronts }, ...(card.types ? { types: [...card.types] } : {}) };
}
