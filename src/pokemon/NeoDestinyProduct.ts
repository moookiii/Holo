import type { PokemonRecipe } from './recipes.ts';

export const neoDestinyWrapper = {
  back: 'neo4-back.png', backBounds: [0,0,1,1] as [number,number,number,number],
  designs: [
    { id: 'noctowl', name: 'Noctowl', front: 'neo4-noctowl.png' },
    { id: 'togetic', name: 'Togetic', front: 'neo4-togetic.png' },
    { id: 'celebi', name: 'Celebi', front: 'neo4-celebi.png' },
    { id: 'tyranitar', name: 'Tyranitar', front: 'neo4-tyranitar.png' },
  ].map(d => ({ ...d, frontBounds: [0,0,1,1] as [number,number,number,number], edition: 'first-edition' as const })),
};
export const neoDestinyRecipe: PokemonRecipe = {
  id: 'neo4-english-first-edition', version: '1', setId: 'neo4', era: 'neo',
  boosterIds: neoDestinyWrapper.designs.map(d => d.id),
  boosterEditions: Object.fromEntries(neoDestinyWrapper.designs.map(d => [d.id, d.edition])),
  requiredCardIds: Array.from({ length: 113 }, (_, i) => `neo4-${i+1}`),
  sources: ['https://api.tcgdex.net/v2/en/sets/neo4',
    'https://pokemonboosterpack.com/archive/pages/about'],
  note: '2002 Neo Destiny · 1st Edition · 7 commons + 3 uncommons + 1 rare. Regular holo estimate 1:3 packs; Shining estimate 1:18 packs, replacing the rare. Remaining 11:18 non-holo rare; uniform within rarity pools. Estimates, not official odds or factory sheet collation.',
  slots: [
    { id: 'common', count: 7, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal' }] },
    { id: 'uncommon', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
    { id: 'rare', count: 1, outcomes: [
      { weight: 11/18, rarities: ['Rare'], variant: 'normal' },
      { weight: 1/3, rarities: ['Holo Rare'], variant: 'holo' },
      { weight: 1/18, rarities: ['Shining Rare'], variant: 'holo' },
    ] },
  ],
};
