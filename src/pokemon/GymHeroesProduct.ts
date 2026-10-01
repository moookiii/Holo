import type { PokemonRecipe } from './recipes.ts';

export const gymHeroesWrapper = {
  back: 'gym1-back.png',
  designs: [{ id: 'brock', name: 'Brock' }, { id: 'misty', name: 'Misty' },
    { id: 'erika', name: 'Erika' }, { id: 'lt-surge', name: 'Lt. Surge' }].map(d => ({
      ...d, edition: 'first-edition' as const, front: `gym1-${d.id}.png`,
    })),
};
export const gymHeroesRecipe: PokemonRecipe = {
  id: 'gym1-english-first-edition', version: '1', setId: 'gym1', era: 'gym',
  boosterIds: gymHeroesWrapper.designs.map(d => d.id),
  boosterEditions: Object.fromEntries(gymHeroesWrapper.designs.map(d => [d.id, d.edition])),
  requiredCardIds: Array.from({ length: 132 }, (_, i) => `gym1-${i+1}`),
  sources: ['https://api.tcgdex.net/v2/en/sets/gym1', 'https://pokemonboosterpack.com/archive/pages/about',
    'https://www.psacard.com/articles/articleview/9353/psa-set-registry-collecting-2000-poke-mon-gym-heroes-1st-edition-card'],
  note: '2000 Gym Heroes · 1st Edition · 6 commons + 1 Basic Energy + 3 uncommons + 1 rare. Estimated 1-in-3 holo rate; uniform cards within rarity pools.',
  slots: [
    { id: 'common', count: 6, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], categories: ['Pokemon', 'Trainer'], variant: 'normal' }] },
    { id: 'energy', count: 1, outcomes: [{ weight: 1, rarities: ['Common'], categories: ['Energy'], energyTypes: ['Normal'], variant: 'normal' }] },
    { id: 'uncommon', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
    { id: 'rare', count: 1, outcomes: [
      { weight: 2/3, rarities: ['Rare'], variant: 'normal' },
      { weight: 1/3, rarities: ['Holo Rare'], variant: 'holo' },
    ] },
  ],
};
