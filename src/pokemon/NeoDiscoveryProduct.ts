import type { PokemonRecipe } from './recipes.ts';

export const neoDiscoveryWrapper = {
  back: 'neo2-back.png', backBounds: [0,0,1,1] as [number,number,number,number],
  designs: [
    { id: 'scizor', name: 'Scizor', front: 'neo2-scizor.png' },
    { id: 'smeargle', name: 'Smeargle', front: 'neo2-smeargle.png' },
    { id: 'xatu', name: 'Xatu', front: 'neo2-xatu.png' },
    { id: 'umbreon', name: 'Umbreon', front: 'neo2-umbreon.png' },
  ].map(d => ({ ...d, edition: 'first-edition' as const })),
};
export const neoDiscoveryRecipe: PokemonRecipe = {
  id: 'neo2-english-first-edition', version: '1', setId: 'neo2', era: 'neo',
  boosterIds: neoDiscoveryWrapper.designs.map(d => d.id),
  boosterEditions: Object.fromEntries(neoDiscoveryWrapper.designs.map(d => [d.id, d.edition])),
  requiredCardIds: Array.from({ length: 75 }, (_, i) => `neo2-${i+1}`),
  sources: ['https://api.tcgdex.net/v2/en/sets/neo2',
    'https://www.ebay.com/itm/267603527376',
    'https://www.psacard.com/articles/articleview/9436/psa-set-registry-collecting-2001-poke-mon-neo-discovery-1st-edition'],
  note: '2001 Neo Discovery · 1st Edition · 7 commons + 3 uncommons + 1 rare. Original packaging: premium cards approximately 1:33 cards (about 1 in 3 packs). Uniform cards within rarity pools are a simulation assumption.',
  slots: [
    { id: 'common', count: 7, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal' }] },
    { id: 'uncommon', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
    { id: 'rare', count: 1, outcomes: [
      { weight: 2/3, rarities: ['Rare'], variant: 'normal' },
      { weight: 1/3, rarities: ['Holo Rare'], variant: 'holo' },
    ] },
  ],
};
