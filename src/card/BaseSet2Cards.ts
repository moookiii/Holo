import type { CardDefinition } from './CardDefinition.ts';
import { baseSet2Cards } from '../pokemon/BaseSet2Catalog.ts';

export const baseSet2HoloProfile = 'pokemon-base-set-2-cosmos';
export const baseSet2Definitions: CardDefinition[] = baseSet2Cards.map(card => {
  const holo = card.variants[0] === 'holo';
  const profile = holo ? baseSet2HoloProfile : 'print-only';
  const maps = `/cards/pokemon/base-set-2/maps/${card.localId}`;
  return {
    id: `pokemon:${card.id}:${holo ? 'holo' : 'normal'}`, title: card.name,
    franchise: 'Pokémon', set: 'Base Set 2', number: `${card.localId}/130${holo ? ' · Holo' : ''}`,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front: card.front!, back: '/cards/pokemon/back.jpg', profile, seed: 200000 + Number(card.localId),
    ...(holo ? { maps: { motif: `${maps}-cosmos.png`, foil: `${maps}-foil.png`, protection: `${maps}-protection.png` },
      mapSettings: { embossStrength: 0 }, substrate: { color: [0, 0, 0] as [number, number, number], printRetention: 1 } } : {}),
    layout: { artwork: [65/600, 96/825, 534/600, 420/825], innerFrame: [23/600, 22/825, 578/600, 803/825] },
    pokemon: { ...card, variant: holo ? 'holo' : 'normal', materialProfile: profile },
    source: { image: `https://assets.tcgdex.net/en/base/base4/${card.localId}/high.png`,
      metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes: holo ? 'Original unlimited Base Set 2 front. Existing Base/Jungle protection registered to reprint artwork; separate PNG coverage. Dedicated early Cosmos profile, no relief. See docs/base-set-2.md.'
        : 'Original numbered English Base Set 2 unlimited non-holo retail print. No first edition or reverse variant.' },
  };
});
