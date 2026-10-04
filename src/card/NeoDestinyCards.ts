import type { CardDefinition } from './CardDefinition.ts';
import { neoDestinyShiningSurface } from '../pokemon/NeoDestinySurfaces.ts';
import { neoDestinyCards } from '../pokemon/NeoDestinyCatalog.ts';

export const neoDestinyHoloProfile = 'pokemon-base-set-2-cosmos';
export const neoDestinyDefinitions: CardDefinition[] = neoDestinyCards.map(card => {
  const holo = card.variants[0] === 'holo';
  const shining = Number(card.localId) >= 106;
  const profile = shining ? neoDestinyShiningSurface.profile : holo ? neoDestinyHoloProfile : 'print-only';
  const maps = `/cards/pokemon/neo-destiny/maps/${card.localId}`;
  return {
    id: `pokemon:${card.id}:${holo ? 'holo' : 'normal'}:first-edition`, title: card.name,
    franchise: 'Pokémon', set: 'Neo Destiny', number: `${card.localId}/105 · 1st Edition${holo ? ' · Holo' : ''}`,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front: card.front!, back: '/cards/pokemon/back.jpg', profile, seed: 240001 + Number(card.localId),
    ...(holo ? { maps: shining ? neoDestinyShiningSurface.maps(card.localId) : { motif: `${maps}-cosmos.png`, foil: `${maps}-foil.png`, protection: `${maps}-protection.png` },
      mapSettings: { embossStrength: 0 }, substrate: { color: [0, 0, 0] as [number, number, number], printRetention: 1 } } : {}),
    layout: { artwork: card.category === 'Energy' ? [20/600,119/825,578/600,606/825] : [63/600,95/825,537/600,424/825], innerFrame: [23/600, 22/825, 578/600, 803/825] },
    pokemon: { ...card, variant: holo ? 'holo' : 'normal', materialProfile: profile },
    source: { image: `https://assets.tcgdex.net/en/neo/neo4/${card.localId}/high.png`,
      metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes: holo ? 'Original TCGdex 1st Edition front; supplied PNG mask; Shining foil is confined to its subject; Cosmos dot placements pending at user request. No relief. See docs/neo-destiny.md.'
        : 'Original numbered English Neo Destiny 1st Edition non-holo print.' },
  };
});
