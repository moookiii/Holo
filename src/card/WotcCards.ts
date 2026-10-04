import { neoRevelationDefinitions } from './NeoRevelationCards.ts';
import { southernIslandsDefinitions } from './SouthernIslandsCards.ts';
import { neoDiscoveryDefinitions } from './NeoDiscoveryCards.ts';
import { neoGenesisDefinitions } from './NeoGenesisCards.ts';
import { wizardsPromoDefinitions } from './WizardsPromoCards.ts';
import { gymChallengeDefinitions } from './GymChallengeCards.ts';
import { gymHeroesDefinitions } from './GymHeroesCards.ts';
import { teamRocketDefinitions } from './TeamRocketCards.ts';
import { baseSet2Definitions } from './BaseSet2Cards.ts';
import { legendaryCollectionDefinitions } from './LegendaryCollectionCards.ts';
import { fossilDefinitions } from './FossilCards.ts';
import { baseSetCards, baseSetAuthoredIds } from './BaseSetCards.ts';
import { jungleDefinitions } from './JungleCards.ts';
import type { CardDefinition } from './CardDefinition.ts';
import type { PrintVariant, PrintEdition } from '../pokemon/types.ts';

/** Exact set + number + print lookup, shared by picker and pack preparation. */
const prints = new Map<string, CardDefinition>([
  ...southernIslandsDefinitions.map(card => [`${card.pokemon!.id}:${card.pokemon!.variant}`, card] as const),
  ...neoRevelationDefinitions.map(card => [`${card.pokemon!.id}:${card.pokemon!.variant}:${card.pokemon!.edition}`, card] as const),
  ...neoDiscoveryDefinitions.map(card => [`${card.pokemon!.id}:${card.pokemon!.variant}:${card.pokemon!.edition}`, card] as const),
  ...neoGenesisDefinitions.map(card => [`${card.pokemon!.id}:${card.pokemon!.variant}:${card.pokemon!.edition}`, card] as const),
  ...wizardsPromoDefinitions.map(card => [`${card.pokemon!.id}:${card.pokemon!.variant}`, card] as const),
  ...gymHeroesDefinitions.map(card => [`${card.pokemon!.id}:${card.pokemon!.variant}:${card.pokemon!.edition}`, card] as const),
  ...gymChallengeDefinitions.map(card => [`${card.pokemon!.id}:${card.pokemon!.variant}:${card.pokemon!.edition}`, card] as const),
  ...teamRocketDefinitions.map(card => [`${card.pokemon!.id}:${card.pokemon!.variant}:${card.pokemon!.edition}`, card] as const),
  ...Object.entries(baseSetAuthoredIds).map(([id, authoredId]) => [`${id}:holo`, baseSetCards.find(card => card.id === authoredId)!] as const),
  ...baseSet2Definitions.map(card => [`${card.pokemon!.id}:${card.pokemon!.variant}`, card] as const),
  ...legendaryCollectionDefinitions.map(card => [`${card.pokemon!.id}:${card.pokemon!.variant}`, card] as const),
  ...fossilDefinitions.map(card => [`${card.pokemon!.id}:${card.pokemon!.variant}`, card] as const),
  ...jungleDefinitions.map(card => [`${card.pokemon!.id}:${card.pokemon!.variant}`, card] as const),
]);
export const wotcPrinting = (id: string, variant: PrintVariant, edition?: PrintEdition) => prints.get(`${id}:${variant}${edition ? ':'+edition : ''}`) ?? prints.get(`${id}:${variant}`);
