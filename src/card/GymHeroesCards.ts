import type { CardDefinition } from './CardDefinition.ts';
import { gymHeroesCards } from '../pokemon/GymHeroesCatalog.ts';

export const gymHeroesHoloProfile = 'pokemon-base-set-2-cosmos';
export const gymHeroesDefinitions: CardDefinition[] = gymHeroesCards.map(card => {
  const holo = card.variants[0] === 'holo';
  const profile = holo ? gymHeroesHoloProfile : 'print-only';
  const maps = `/cards/pokemon/gym-heroes/maps/${card.localId}`;
  return {
    id: `pokemon:${card.id}:${holo ? 'holo' : 'normal'}:first-edition`, title: card.name,
    franchise: 'Pokémon', set: 'Gym Heroes', number: `${card.localId}/132 · 1st Edition${holo ? ' · Holo' : ''}`,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front: card.front!, back: '/cards/pokemon/back.jpg', profile, seed: 200001 + Number(card.localId),
    ...(holo ? { maps: { motif: `${maps}-cosmos.png`, foil: `${maps}-foil.png`, protection: `${maps}-protection.png` },
      mapSettings: { embossStrength: 0 }, substrate: { color: [0, 0, 0] as [number, number, number], printRetention: 1 } } : {}),
    layout: { artwork: card.category === 'Trainer' ? [56/600,190/825,551/600,459/825] : [65/600,96/825,535/600,420/825], innerFrame: [23/600, 22/825, 578/600, 803/825] },
    pokemon: { ...card, variant: holo ? 'holo' : 'normal', materialProfile: profile },
    source: { image: `https://assets.tcgdex.net/en/gym/gym1/${card.localId}/high.png`,
      metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes: holo ? 'Original TCGdex 1st Edition front; user-authored subject/lightning protection and independently measured filled Cosmos dots. No relief. See docs/gym-heroes.md.'
        : 'Original numbered English Gym Heroes 1st Edition non-holo print.' },
  };
});
