import { gymChallengeRecipe, gymChallengeWrapper } from './GymChallengeProduct.ts';
import { gymHeroesRecipe, gymHeroesWrapper } from './GymHeroesProduct.ts';
import { teamRocketRecipe, teamRocketWrapper } from './TeamRocketProduct.ts';
import { legendaryCollectionRecipe, legendaryCollectionWrapper } from './LegendaryCollectionProduct.ts';
import type { PokemonRecipe } from './recipes.ts';

/** Explicit product slots; no era-wide assumption about Energy or rare prints. */
export const wotcRecipes: readonly PokemonRecipe[] = [
  teamRocketRecipe, gymHeroesRecipe, gymChallengeRecipe, legendaryCollectionRecipe,
  { id: 'base4-english-retail', version: '1', setId: 'base4', era: 'base',
    boosterIds: ['mewtwo', 'pidgeot', 'raichu', 'gyarados'],
    requiredCardIds: Array.from({ length: 130 }, (_, i) => `base4-${i + 1}`),
    sources: ['https://api.tcgdex.net/v2/en/sets/base4', 'https://bulbapedia.bulbagarden.net/wiki/Base_Set_2_(TCG)'],
    note: '2000 Base Set 2 · 5 commons + 2 in-set Basic Energy + 3 uncommons + 1 rare · unlimited only · estimated 1-in-3 Cosmos holo rate; uniform cards within rarity pools.',
    slots: [
      { id: 'common', count: 5, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal', categories: ['Pokemon', 'Trainer'] }] },
      { id: 'energy', count: 2, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal', categories: ['Energy'], energyTypes: ['Normal'] }] },
      { id: 'uncommon', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
      { id: 'rare', count: 1, outcomes: [
        { weight: 2 / 3, rarities: ['Rare'], variant: 'normal' },
        { weight: 1 / 3, rarities: ['Holo Rare'], variant: 'holo', cardIds: Array.from({ length: 20 }, (_, i) => `base4-${i + 1}`) },
      ] },
    ] },

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
export const wotcWrappers: Record<string, { back: string; backBounds?: [number, number, number, number]; designs: readonly { id: string; name?: string; edition?: import('./types.ts').PrintEdition; front?: string; frontBounds?: [number, number, number, number]; back?: string; backBounds?: [number, number, number, number] }[] }> = {
  base5: teamRocketWrapper, gym1: gymHeroesWrapper, gym2: gymChallengeWrapper,
  lc: legendaryCollectionWrapper,
  base4: { back: 'base4-back.jpg', backBounds: [20/2379, 15/4080, 2350/2379, 4060/4080], designs: [
    { id: 'mewtwo', front: 'base4-mewtwo.jpg' },
    { id: 'pidgeot', front: 'base4-pidgeot.jpg', back: 'base4-pidgeot-back.jpg', backBounds: [61/719, 51/1200, 674/719, 1144/1200] },
    { id: 'raichu', front: 'base4-raichu.jpg', back: 'base4-raichu-back.jpg', backBounds: [644/1824, 195/1368, 1190/1824, 1170/1368] },
    // The back reference has a long upper crimp; use its matching short-crimp area.
    { id: 'gyarados', front: 'base4-gyarados.jpg', back: 'base4-gyarados-back.jpg', backBounds: [360/1367, 355/1823, 996/1367, 1530/1823] },
  ] },
  base1: { back: 'base1-back.jpg', designs: [
    { id: 'blastoise', front: 'base1-blastoise.jpg' }, { id: 'charizard', front: 'base1-charizard.jpg' }, { id: 'venusaur', front: 'base1-venusaur.png' },
  ] },
  // User-supplied original wrapper scans; Wigglytuff includes an outer margin.
  base2: { back: 'base2-back.png', designs: [
    { id: 'flareon', front: 'base2-flareon.jpg' }, { id: 'scyther', front: 'base2-scyther.jpg' },
    { id: 'wigglytuff', front: 'base2-wigglytuff.png', frontBounds: [296/1080, 114/1080, 785/1080, 965/1080] },
  ] },
  base3: { back: 'base3-back.jpg', backBounds: [40/1098, 35/1893, 1059/1098, 1858/1893], designs: [
    { id: 'lapras', front: 'base3-lapras.png' }, { id: 'aerodactyl', front: 'base3-aerodactyl.png' },
    { id: 'zapdos', front: 'base3-zapdos.png' },
  ] },
};
