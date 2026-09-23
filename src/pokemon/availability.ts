import { recipeFor } from './recipes.ts';
import { PRISMATIC_SET_ID } from './PrismaticCatalog.ts';
import { prismaticSurfaceProgress } from './PrismaticSurfaces.ts';

/** Collation support and render readiness are independent. Never reroll away
 * from cards with missing surfaces or silently substitute another material.
 */
export function packAvailability(setId: string): { ready: boolean; label: string; detail: string } {
  if (!recipeFor(setId)) return { ready: false, label: 'Browse only · recipe not validated',
    detail: 'Opening unavailable: this set has no validated pack recipe.' };
  if (setId === PRISMATIC_SET_ID && !prismaticSurfaceProgress().complete) return {
    ready: false, label: 'Surface reconstruction in progress',
    detail: 'The complete Prismatic Evolutions checklist and pack recipe are loaded. Opening awaits the card-specific foil surfaces.',
  };
  return { ready: true, label: 'Opening available', detail: '' };
}
