import type { PokemonRecipe } from './recipes.ts';

export const neoRevelationWrapper = {
  back: 'neo3-back.png', backBounds: [0,0,1,1] as [number,number,number,number],
  designs: [
    { id: 'entei', name: 'Entei', front: 'neo3-entei.png' },
    { id: 'suicune', name: 'Suicune', front: 'neo3-suicune.png' },
    { id: 'raikou', name: 'Raikou', front: 'neo3-raikou.png' },
    { id: 'misdreavus', name: 'Misdreavus', front: 'neo3-misdreavus.png' },
  ].map(d => ({ ...d, frontBounds: [.015,.015,.985,.985] as [number,number,number,number], edition: 'first-edition' as const })),
};
export const neoRevelationRecipe: PokemonRecipe = {
  id: 'neo3-english-first-edition', version: '1', setId: 'neo3', era: 'neo',
  boosterIds: neoRevelationWrapper.designs.map(d => d.id),
  boosterEditions: Object.fromEntries(neoRevelationWrapper.designs.map(d => [d.id, d.edition])),
  requiredCardIds: Array.from({ length: 66 }, (_, i) => `neo3-${i+1}`),
  sources: ['https://api.tcgdex.net/v2/en/sets/neo3',
    'https://www.psacard.com/Articles/ArticleView/9458/psa-set-registry-collecting-2001-poke-mon-neo-revelation-1st-edition',
    'https://pokemonboosterpack.com/archive/pages/about'],
  note: '2001 Neo Revelation Â· 1st Edition Â· 7 commons + 3 uncommons + 1 rare. Regular holo estimate 1:3 packs; user-selected Shining estimate 1:12 packs, replacing the rare. Remaining 7:12 non-holo rare; uniform within rarity pools. Estimates, not official odds or factory sheet collation.',
  slots: [
    { id: 'common', count: 7, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal' }] },
    { id: 'uncommon', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
    { id: 'rare', count: 1, outcomes: [
      { weight: 7/12, rarities: ['Rare'], variant: 'normal' },
      { weight: 1/3, rarities: ['Holo Rare'], variant: 'holo' },
      { weight: 1/12, rarities: ['Shining Rare'], variant: 'holo' },
    ] },
  ],
};
