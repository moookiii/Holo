import type { CardDefinition } from './CardDefinition.ts';
import { fossilCards } from '../pokemon/FossilCatalog.ts';

/** Preserve the separate retail holo prints with user-authored protection and registered star maps. */
export const fossilDefinitions: CardDefinition[] = fossilCards.map(card => {
  const holo = card.variants[0] === 'holo';
  const profile = holo ? 'pokemon-base-set-star' : 'print-only';
  const maps = `/cards/pokemon/fossil/maps/${card.localId}`;
  return {
    id: `pokemon:${card.id}:${holo ? 'holo' : 'normal'}`, title: card.name,
    franchise: 'Pokémon', set: 'Fossil', number: `${card.localId}/62${holo ? ' · Holo' : ''}`,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front: card.front!, back: '/cards/pokemon/back.jpg', profile, seed: 19991000 + Number(card.localId),
    ...(holo ? { maps: { foil: `${maps}-foil.png`, protection: `${maps}-protection.png`, laminate: `${maps}-laminate.png`, motif: `${maps}-stars.png` },
      mapSettings: { embossStrength: 0 }, substrate: { color: [0,0,0] as [number,number,number], printRetention: 1 } } : {}),
    pokemon: { ...card, variant: holo ? 'holo' : 'normal', materialProfile: profile },
    source: { image: `https://assets.tcgdex.net/en/base/base3/${card.localId}/high.png`,
      metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes: holo ? 'Original TCGdex Fossil front; supplied cutout outlines rasterized to PNG protection. Stars registered against the clean original. Existing Base Set holo material, no relief.'
        : 'Original numbered Fossil non-holo retail front; distinct from its holo counterpart.' },
  };
});
