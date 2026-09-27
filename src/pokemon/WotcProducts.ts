import type { PokemonRecipe } from './recipes.ts';

/** Explicit product slots; no era-wide assumption about Energy or rare prints. */
export const wotcRecipes: readonly PokemonRecipe[] = [
  { id: 'base1-english-retail', version: '1', setId: 'base1', era: 'base',
    sources: ['https://www.cs.sjsu.edu/~stamp/cv/papers/pokemon.pdf', 'https://www.pokebeach.com/tcg/base-set/theme-decks'],
    note: '1999 Base Set · 5 commons + 2 in-set Basic Energy + 3 uncommons + 1 rare · no reverse · holo rate estimated at 1 in 3 packs.',
    slots: [
      { id: 'common', count: 5, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal', categories: ['Pokemon', 'Trainer'] }] },
      { id: 'energy', count: 2, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal', categories: ['Energy'], energyTypes: ['Normal'] }] },
      { id: 'uncommon', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
      { id: 'rare', count: 1, outcomes: [
        { weight: 2 / 3, rarities: ['Rare'], variant: 'normal' },
        { weight: 1 / 3, rarities: ['Holo Rare'], variant: 'holo', excludedCardIds: ['base1-8'] },
      ] },
    ] },
  { id: 'base2-english-retail', version: '1', setId: 'base2', era: 'base',
    boosterIds: ['flareon', 'scyther', 'wigglytuff'],
    requiredCardIds: Array.from({ length: 64 }, (_, i) => `base2-${i + 1}`),
    sources: ['https://api.tcgdex.net/v2/en/sets/base2', 'https://bulbapedia.bulbagarden.net/wiki/Jungle_(TCG)'],
    note: '1999 Jungle · 7 commons + 3 uncommons + 1 rare · no Energy or reverse slot · estimated 1-in-3 holo rate; uniform cards within each rarity pool.',
    slots: [
      { id: 'common', count: 7, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal' }] },
      { id: 'uncommon', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
      { id: 'rare', count: 1, outcomes: [
        { weight: 2 / 3, rarities: ['Rare'], variant: 'normal', cardIds: Array.from({ length: 16 }, (_, i) => `base2-${i + 17}`) },
        { weight: 1 / 3, rarities: ['Holo Rare'], variant: 'holo', cardIds: Array.from({ length: 16 }, (_, i) => `base2-${i + 1}`) },
      ] },
    ] },
  { id: 'base3-english-retail', version: '1', setId: 'base3', era: 'base',
    boosterIds: ['lapras', 'aerodactyl', 'zapdos'],
    requiredCardIds: Array.from({ length: 62 }, (_, i) => `base3-${i + 1}`),
    sources: ['https://api.tcgdex.net/v2/en/sets/base3', 'https://www.pojo.com/pokemon-fossil-expansion-set-price-guide/'],
    note: '1999 Fossil · 7 commons + 3 uncommons + 1 rare · no Energy or reverse slot · estimated 1-in-3 holo rate; uniform cards within each rarity pool.',
    slots: [
      { id: 'common', count: 7, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal' }] },
      { id: 'uncommon', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
      { id: 'rare', count: 1, outcomes: [
        { weight: 2 / 3, rarities: ['Rare'], variant: 'normal', cardIds: Array.from({ length: 15 }, (_, i) => `base3-${i + 16}`) },
        { weight: 1 / 3, rarities: ['Holo Rare'], variant: 'holo', cardIds: Array.from({ length: 15 }, (_, i) => `base3-${i + 1}`) },
      ] },
    ] },
];

/** Wrapper identity is cosmetic; it never changes a product's card odds. */
export const wotcWrappers: Record<string, { back: string; designs: readonly { id: string; front?: string; frontBounds?: [number, number, number, number] }[] }> = {
  base1: { back: 'base1-back.jpg', designs: [
    { id: 'blastoise', front: 'base1-blastoise.jpg' }, { id: 'charizard', front: 'base1-charizard.jpg' }, { id: 'venusaur', front: 'base1-venusaur.png' },
  ] },
  // User-supplied original wrapper scans; Wigglytuff includes an outer margin.
  base2: { back: 'base2-back.png', designs: [
    { id: 'flareon', front: 'base2-flareon.jpg' }, { id: 'scyther', front: 'base2-scyther.jpg' },
    { id: 'wigglytuff', front: 'base2-wigglytuff.png', frontBounds: [296/1080, 114/1080, 785/1080, 965/1080] },
  ] },
};
