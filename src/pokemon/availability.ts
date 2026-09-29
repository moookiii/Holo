import { recipeFor } from './recipes.ts';
import { PRISMATIC_SET_ID } from './PrismaticCatalog.ts';
import { prismaticSurfaceProgress } from './PrismaticSurfaces.ts';
import { jungleReadyHolos } from '../card/JungleCards.ts';

/** Collation support and render readiness are independent. Never reroll away
 * from cards with missing surfaces or silently substitute another material.
 */
export function packAvailability(setId: string): { ready: boolean; label: string; detail: string } {
  if (!recipeFor(setId)) return { ready: false, label: 'Browse only · recipe not validated',
    detail: 'Opening unavailable: this set has no validated pack recipe.' };
  if (setId === 'base5') return { ready: true, label: 'Opening available',
    detail: '83 cards · 1st Edition and Unlimited. 18 holos with registered foil, including secret rare Dark Raichu.' };
  if (setId === 'base4') return { ready: true, label: 'Opening available',
    detail: 'Base Set 2 includes all 130 unlimited prints, 20 Cosmos holos and four original booster designs.' };
  if (setId === 'base3') return { ready: true, label: 'Opening available',
    detail: 'Fossil includes all 62 original prints and 15 animated holos, with all three original booster designs.' };
  if (setId === 'base2' && jungleReadyHolos.size < 16) return { ready: true, label: `Opening available · ${jungleReadyHolos.size}/16 holos ready`,
    detail: `${jungleReadyHolos.size} Jungle holos have animated foil; the remaining ${16-jungleReadyHolos.size} retain their original fronts until the next cutout pass.` };
  if (setId === PRISMATIC_SET_ID && !prismaticSurfaceProgress().complete) return {
    ready: false, label: 'Surface reconstruction in progress',
    detail: 'The complete Prismatic Evolutions checklist and pack recipe are loaded. Opening awaits the card-specific foil surfaces.',
  };
  return { ready: true, label: 'Opening available', detail: '' };
}
