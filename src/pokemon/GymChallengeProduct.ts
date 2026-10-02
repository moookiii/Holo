import type { PokemonRecipe } from './recipes.ts';

export const gymChallengeWrapper = {
  back: 'gym2-back.png',
  designs: [{ id: 'blaine', name: 'Blaine' }, { id: 'giovanni', name: 'Giovanni' },
    { id: 'koga', name: 'Koga' }, { id: 'sabrina', name: 'Sabrina' }].map(d => ({
      ...d, edition: 'first-edition' as const, front: `gym2-${d.id}.png`,
    })),
};
export const gymChallengeRecipe: PokemonRecipe = {
  id: 'gym2-english-first-edition', version: '1', setId: 'gym2', era: 'gym',
  boosterIds: gymChallengeWrapper.designs.map(d => d.id),
  boosterEditions: Object.fromEntries(gymChallengeWrapper.designs.map(d => [d.id, d.edition])),
  requiredCardIds: Array.from({ length: 132 }, (_, i) => `gym2-${i+1}`),
  sources: ['https://api.tcgdex.net/v2/en/sets/gym2', 'https://pokemonboosterpack.com/archive/pages/about',
    'https://www.psacard.com/articles/articleview/9378/psa-set-registry-collecting-2000-poke-mon-gym-challenge-1st-edition-card'],
  note: '2000 Gym Challenge · 1st Edition · 6 commons → 1 rare → 3 uncommons → 1 Basic Energy. Approximate 1-in-3 holo rate; uniform cards within rarity pools.',
  slots: [
    { id: 'common', count: 6, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], categories: ['Pokemon', 'Trainer'], variant: 'normal' }] },
    { id: 'rare', count: 1, outcomes: [
      { weight: 2/3, rarities: ['Rare'], variant: 'normal' },
      { weight: 1/3, rarities: ['Holo Rare'], variant: 'holo' },
    ] },
    { id: 'uncommon', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
    { id: 'energy', count: 1, outcomes: [{ weight: 1, rarities: ['Common'], categories: ['Energy'], energyTypes: ['Normal'], variant: 'normal' }] },
  ],
};
