import type { CardDefinition } from './CardDefinition.ts';
import { gymChallengeCards } from '../pokemon/GymChallengeCatalog.ts';

export const gymChallengeHoloProfile = 'pokemon-base-set-2-cosmos';
export const gymChallengeDefinitions: CardDefinition[] = gymChallengeCards.map(card => {
  const holo = card.variants[0] === 'holo';
  const profile = holo ? gymChallengeHoloProfile : 'print-only';
  const maps = `/cards/pokemon/gym-challenge/maps/${card.localId}`;
  return {
    id: `pokemon:${card.id}:${holo ? 'holo' : 'normal'}:first-edition`, title: card.name,
    franchise: 'Pokémon', set: 'Gym Challenge', number: `${card.localId}/132 · 1st Edition${holo ? ' · Holo' : ''}`,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front: card.front!, back: '/cards/pokemon/back.jpg', profile, seed: 210001 + Number(card.localId),
    ...(holo ? { maps: { motif: `${maps}-cosmos.png`, foil: `${maps}-foil.png`, protection: `${maps}-protection.png` },
      mapSettings: { embossStrength: 0 }, substrate: { color: [0, 0, 0] as [number, number, number], printRetention: 1 } } : {}),
    layout: { artwork: card.category === 'Trainer' ? [56/600,193/825,551/600,460/825] : [65/600,98/825,534/600,(card.localId === '14' ? 356 : 421)/825], innerFrame: [23/600, 22/825, 578/600, 803/825] },
    pokemon: { ...card, variant: holo ? 'holo' : 'normal', materialProfile: profile },
    source: { image: card.localId === '107' ? card.front! : `https://assets.tcgdex.net/en/gym/gym2/${card.localId}/high.png`,
      metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes: holo ? 'Original TCGdex 1st Edition front; user-authored subject/lightning protection and independently measured filled Cosmos dots. No relief. See docs/gym-challenge.md.'
        : card.localId === '107' ? 'User-supplied 1st Edition front replaces the Unlimited image served by TCGdex. TCGdex metadata retained.' : 'Original numbered English Gym Challenge 1st Edition non-holo print.' },
  };
});
