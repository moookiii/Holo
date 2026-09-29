import type { CardDefinition } from './CardDefinition.ts';
import { teamRocketCards } from '../pokemon/TeamRocketCatalog.ts';
import { teamRocketEditions } from '../pokemon/TeamRocketProduct.ts';
import { editionLabel } from '../pokemon/types.ts';

/** Exact numbered print + edition is the hook for the later authored visual pass.
 * Add card/edition-specific maps and profile here when provided. No generic
 * foil coverage or provisional Cosmos pattern is assigned in this integration.
 */
export const teamRocketDefinitions: CardDefinition[] = teamRocketCards.flatMap(card => teamRocketEditions.map(edition => {
  const variant = card.variants[0], holo = variant === 'holo';
  const front = card.editionFronts![edition]!;
  return {
    id: `pokemon:${card.id}:${variant}:${edition}`, title: card.name, franchise: 'Pokémon', set: 'Team Rocket',
    number: `${card.localId}/82 · ${editionLabel(edition)}${holo ? ' · Holo visuals pending' : ' · Non-holo'}`,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front, back: '/cards/pokemon/back.jpg', profile: 'print-only', seed: 200500 + Number(card.localId),
    pokemon: { ...card, edition, front, thumbnail: front, variant, materialProfile: 'print-only', ...(holo ? { treatmentStatus: 'deferred' as const } : {}) },
    source: { image: front, metadata: `https://api.tcgdex.net/v2/en/cards/${card.id}`,
      notes: `${editionLabel(edition)} original front. ${holo ? 'Holo identity retained; all holo visuals intentionally deferred. No masks or pattern approximation.' : 'Exact separately numbered non-holo retail print.'} See docs/team-rocket.md and scripts/team-rocket/*sources.json.` },
  };
}));
