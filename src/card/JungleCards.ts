import type { CardDefinition } from './CardDefinition.ts';
import { jungleCards } from '../pokemon/JungleCatalog.ts';

export const jungleHoloProfile = 'pokemon-base-set-star';

/** Each numbered front is a distinct printing, including the non-holo rares. */
export const jungleDefinitions: CardDefinition[] = jungleCards.map(card => {
  const holo = card.variants[0] === 'holo';
  return {
    id: `pokemon:${card.id}:${holo ? 'holo' : 'normal'}`, title: card.name, franchise: 'Pokémon', set: 'Jungle', number: `${card.localId}/64${holo ? ' · Holo · cutouts pending' : ''}`,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    // Holo identities remain eligible, but their authored cutouts are deferred
    // at the user's request. Activate jungleHoloProfile with their PNG maps later.
    front: card.front!, back: '/cards/pokemon/back.jpg', profile: 'print-only', seed: 199900 + Number(card.localId),
    layout: { artwork: [65/600, 101/825, 536/600, 423/825], innerFrame: [23/600, 22/825, 578/600, 803/825] },
    pokemon: { ...card, variant: holo ? 'holo' : 'normal', materialProfile: 'print-only', ...(holo ? { treatmentStatus: 'deferred' as const } : {}) },
    source: { image: `https://assets.tcgdex.net/en/base/base2/${card.localId}/high.png`, metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes: holo ? `Original English Jungle holo print from TCGdex. Cutouts deferred by user; intended material ${jungleHoloProfile}. Print-only rendering until PNG coverage and protection are authored.`
        : 'Original English numbered Jungle non-holo print from TCGdex; separate from its holo counterpart.' },
  };
});
