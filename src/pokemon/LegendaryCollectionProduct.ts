import type { PokemonRecipe } from './recipes.ts';

export const legendaryCollectionWrapper = {
  back: 'lc-back.jpg',
  designs: [
    { id: 'starters', name: 'Venusaur, Charizard & Blastoise', front: 'lc-starters.webp' },
    { id: 'eeveelutions', name: 'Vaporeon, Jolteon & Flareon', front: 'lc-eeveelutions.png' },
    { id: 'birds', name: 'Articuno, Zapdos & Moltres', front: 'lc-birds.png' },
    { id: 'mewtwo', name: 'Alakazam, Machamp & Mewtwo', front: 'lc-mewtwo.png' },
  ],
};
/** 11-card retail pack: six commons, three uncommons, one rare and one reverse. */
export const legendaryCollectionRecipe: PokemonRecipe = {
  id: 'lc-english-retail', version: '1', setId: 'lc', era: 'lc',
  boosterIds: legendaryCollectionWrapper.designs.map(d => d.id),
  requiredCardIds: Array.from({ length: 110 }, (_, i) => `lc-${i + 1}`),
  sources: ['https://api.tcgdex.net/v2/en/sets/lc', 'https://bulbapedia.bulbagarden.net/wiki/Legendary_Collection_(TCG)'],
  note: '2002 Legendary Collection · 6 commons + 3 uncommons + 1 rare + 1 guaranteed reverse holo. Estimated one-in-three regular holo rare; uniform within rarity pools.',
  slots: [
    { id: 'common', count: 6, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal' }] },
    { id: 'uncommon', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
    { id: 'rare', count: 1, outcomes: [
      { weight: 2/3, rarities: ['Rare'], variant: 'normal' },
      { weight: 1/3, rarities: ['Holo Rare'], variant: 'holo' },
    ] },
    { id: 'reverse', count: 1, outcomes: [{ weight: 1, rarities: ['Common', 'Uncommon', 'Rare', 'Holo Rare'], variant: 'reverse' }] },
  ],
};
