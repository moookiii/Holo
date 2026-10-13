import { ascendedSpecialReverses } from './data/ascended-special.generated.ts';
import type { PrintVariant } from './types.ts';

const byCard = new Map(ascendedSpecialReverses.map(p => [p.cardId as string, {
  ...p,
  maps: {
    foil: `/cards/pokemon/tcgl-ascended-original/registered/${p.cardId}-foil.png`,
    protection: `/cards/pokemon/tcgl-ascended-original/registered/${p.cardId}-protection.png`,
  },
}]));
export const ascendedPatternLabels = {
  'poke-ball': 'Poké Ball', 'quick-ball': 'Quick Ball', 'dusk-ball': 'Dusk Ball',
  'love-ball': 'Love Ball', 'friend-ball': 'Friend Ball', 'team-rocket': 'Team Rocket R',
} as const;
export function ascendedSpecialSurface(id: string, variant: PrintVariant) {
  return variant === 'special-reverse' ? byCard.get(id) : undefined;
}
