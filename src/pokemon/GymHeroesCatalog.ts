import { localBoosterArt } from './boosterArt.ts';
import { gymHeroesRecords } from './data/gym-heroes.generated.ts';
import { gymHeroesWrapper } from './GymHeroesProduct.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const GYM_HEROES_ID = 'gym1';
export const gymHeroesCards: readonly PokemonCard[] = gymHeroesRecords.map(record => {
  const n = Number(record.localId), holo = n <= 19;
  const editionFronts = {
    'first-edition': `/cards/pokemon/gym-heroes/${record.front}`,
  };
  return { ...record, setId: GYM_HEROES_ID, setName: 'Gym Heroes', seriesId: 'gym', seriesName: 'Gym', era: 'gym',
    rarity: holo ? 'Holo Rare' : record.rarity,
    variants: [holo ? 'holo' : 'normal'], edition: 'first-edition', editionFronts,
    boosterIds: gymHeroesWrapper.designs.map(d => d.id),
    front: editionFronts['first-edition'], thumbnail: editionFronts['first-edition'] };
});
export const gymHeroesSet: PokemonSet = {
  id: GYM_HEROES_ID, name: 'Gym Heroes', series: { id: 'gym', name: 'Gym' }, era: 'gym', releaseDate: '2000-08-14',
  logo: '/packs/pokemon/gym1-logo.png', cardIds: gymHeroesCards.map(c => c.id), boosters: localBoosterArt(GYM_HEROES_ID)!,
};
const byId = new Map(gymHeroesCards.map(c => [c.id, c]));
export function gymHeroesCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Gym Heroes card: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [...card.boosterIds!], editionFronts: { ...card.editionFronts }, ...(card.types ? { types: [...card.types] } : {}) };
}
