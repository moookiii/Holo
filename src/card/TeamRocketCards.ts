import type { CardDefinition } from './CardDefinition.ts';
import { teamRocketCards } from '../pokemon/TeamRocketCatalog.ts';
import { teamRocketEditions } from '../pokemon/TeamRocketProduct.ts';
import { editionLabel } from '../pokemon/types.ts';

/** The supplied contours protect print; each edition has registered PNG optics. */
export const teamRocketCosmosProfile = 'pokemon-base-set-2-cosmos';
export const teamRocketTrainerProfile = 'pokemon-team-rocket-trainer';
export const teamRocketDefinitions: CardDefinition[] = teamRocketCards.flatMap(card => teamRocketEditions.map(edition => {
  const variant = card.variants[0], holo = variant === 'holo';
  const profile = holo ? card.localId === '15' ? teamRocketTrainerProfile : teamRocketCosmosProfile : 'print-only';
  const maps = `/cards/pokemon/team-rocket/maps/${card.localId}-${edition}`;
  const front = card.editionFronts![edition]!;
  return {
    id: `pokemon:${card.id}:${variant}:${edition}`, title: card.name, franchise: 'Pokémon', set: 'Team Rocket',
    number: `${card.localId}/82 · ${editionLabel(edition)}${holo ? ' · Holo' : ' · Non-holo'}`,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front, back: '/cards/pokemon/back.jpg', profile, seed: 200500 + Number(card.localId),
    ...(holo ? { maps: { foil: `${maps}-foil.png`, protection: `${maps}-protection.png`,
      ...(card.localId === '15' ? { direction: `${maps}-direction.png` } : { motif: `${maps}-cosmos.png` }) },
      mapSettings: { embossStrength: 0 }, substrate: { color: [0, 0, 0] as [number, number, number], printRetention: 1 } } : {}),
    layout: { artwork: (card.localId === '17' ? [20/600,113/825,580/600,600/825] : card.category === 'Trainer' ? [56/600,190/825,551/600,459/825] : [65/600,96/825,535/600,420/825]) as [number,number,number,number],
      innerFrame: [23/600,22/825,578/600,803/825] },
    pokemon: { ...card, edition, front, thumbnail: front, variant, materialProfile: profile },
    source: { image: front, metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes: `${editionLabel(edition)} original front. ${holo ? 'User-traced protection registered to this edition. Measured filled Cosmos dots; #15 uses scan-registered directional foil instead. No relief.' : 'Exact separately numbered non-holo retail print.'} See docs/team-rocket.md and scripts/team-rocket/*sources.json.` },
  };
}));
