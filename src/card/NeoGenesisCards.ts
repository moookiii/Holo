import type { CardDefinition } from './CardDefinition.ts';
import { neoGenesisCards } from '../pokemon/NeoGenesisCatalog.ts';

export const neoGenesisHoloProfile = 'pokemon-base-set-2-cosmos';
export const neoGenesisDefinitions: CardDefinition[] = neoGenesisCards.filter(card => card.localId !== '9').map(card => {
  const holo = card.variants[0] === 'holo';
  const profile = holo ? neoGenesisHoloProfile : 'print-only';
  const maps = `/cards/pokemon/neo-genesis/maps/${card.localId}`;
  return {
    id: `pokemon:${card.id}:${holo ? 'holo' : 'normal'}:first-edition`, title: card.name,
    franchise: 'Pokémon', set: 'Neo Genesis', number: `${card.localId}/111 · 1st Edition${holo ? ' · Holo' : ''}`,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front: card.front!, back: '/cards/pokemon/back.jpg', profile, seed: 210001 + Number(card.localId),
    ...(holo ? { maps: { motif: `${maps}-cosmos.png`, foil: `${maps}-foil.png`, protection: `${maps}-protection.png` },
      mapSettings: { embossStrength: 0 }, substrate: { color: [0, 0, 0] as [number, number, number], printRetention: 1 } } : {}),
    layout: { artwork: card.localId === '19' ? [24/600,119/825,575/600,599/825] : [63/600,95/825,537/600,424/825], innerFrame: [23/600, 22/825, 578/600, 803/825] },
    pokemon: { ...card, variant: holo ? 'holo' : 'normal', materialProfile: profile },
    source: { image: `https://assets.tcgdex.net/en/neo/neo1/${card.localId}/high.png`,
      metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes: holo ? 'Original TCGdex 1st Edition front; user-authored subject protection and independently measured filled Cosmos dots. No relief. See docs/neo-genesis.md.'
        : 'Original numbered English Neo Genesis 1st Edition non-holo print.' },
  };
});
