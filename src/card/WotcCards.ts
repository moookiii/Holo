import { baseSetCards, baseSetAuthoredIds } from './BaseSetCards.ts';
import { jungleDefinitions } from './JungleCards.ts';
import type { CardDefinition } from './CardDefinition.ts';
import type { PrintVariant } from '../pokemon/types.ts';

/** Exact set + number + print lookup, shared by picker and pack preparation. */
const prints = new Map<string, CardDefinition>([
  ...Object.entries(baseSetAuthoredIds).map(([id, authoredId]) => [`${id}:holo`, baseSetCards.find(card => card.id === authoredId)!] as const),
  ...jungleDefinitions.map(card => [`${card.pokemon!.id}:${card.pokemon!.variant}`, card] as const),
]);
export const wotcPrinting = (id: string, variant: PrintVariant) => prints.get(`${id}:${variant}`);
