import type { CardDefinition } from './CardDefinition.ts';
import { fossilCards } from '../pokemon/FossilCatalog.ts';

/** Preserve the separate retail holo prints while their surfaces are deferred. */
export const fossilDefinitions: CardDefinition[] = fossilCards.map(card => {
  const holo = card.variants[0] === 'holo';
  return {
    id: `pokemon:${card.id}:${holo ? 'holo' : 'normal'}`, title: card.name,
    franchise: 'Pokémon', set: 'Fossil', number: `${card.localId}/62${holo ? ' · Holo · foil pending' : ''}`,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front: card.front!, back: '/cards/pokemon/back.jpg', profile: 'print-only', seed: 19991000 + Number(card.localId),
    pokemon: { ...card, variant: holo ? 'holo' : 'normal', materialProfile: 'print-only',
      ...(holo ? { treatmentStatus: 'deferred' as const } : {}) },
    source: { image: `https://assets.tcgdex.net/en/base/base3/${card.localId}/high.png`,
      metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes: holo ? 'Original numbered Fossil holo front. Animated foil, cutouts and star placement deferred by user; no substitute shader.'
        : 'Original numbered Fossil non-holo retail front; distinct from its holo counterpart.' },
  };
});
