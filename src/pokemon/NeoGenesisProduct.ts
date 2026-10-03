import type { PokemonRecipe } from './recipes.ts';

export const neoGenesisWrapper = {
  back: 'neo1-back.png',
  // The back scan is taller than the wrapper fronts. Trim equal amounts from
  // the end crimps so its image fills the full width of every pack design.
  backBounds: [0, 31/1115, 1, 1084/1115] as [number, number, number, number],
  designs: [
    { id: 'typhlosion', name: 'Typhlosion', front: 'neo1-typhlosion.jpg' },
    { id: 'lugia', name: 'Lugia', front: 'neo1-lugia.webp' },
    { id: 'feraligatr', name: 'Feraligatr', front: 'neo1-feraligatr.jpg' },
    { id: 'meganium', name: 'Meganium', front: 'neo1-meganium.jpg' },
  ].map(d => ({ ...d, edition: 'first-edition' as const })),
};
export const neoGenesisRecipe: PokemonRecipe = {
  id: 'neo1-english-first-edition', version: '1', setId: 'neo1', era: 'neo',
  boosterIds: neoGenesisWrapper.designs.map(d => d.id),
  boosterEditions: Object.fromEntries(neoGenesisWrapper.designs.map(d => [d.id, d.edition])),
  requiredCardIds: Array.from({ length: 111 }, (_, i) => `neo1-${i+1}`),
  sources: ['https://api.tcgdex.net/v2/en/sets/neo1',
    'https://www.psacard.com/articles/articleview/9409/public/locales'],
  note: '2000 Neo Genesis · 1st Edition · 7 commons + 3 uncommons + 1 rare. Estimated 1-in-3 holo rate; uniform cards within rarity pools. Supplied wrapper photographs retained as provided.',
  slots: [
    { id: 'common', count: 7, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal' }] },
    { id: 'uncommon', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
    { id: 'rare', count: 1, outcomes: [
      { weight: 2/3, rarities: ['Rare'], variant: 'normal' },
      { weight: 1/3, rarities: ['Holo Rare'], variant: 'holo' },
    ] },
  ],
};
