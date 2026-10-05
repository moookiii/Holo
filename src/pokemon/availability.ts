import { collectionProductFor } from './CollectionProducts.ts';
import { recipeFor } from './recipes.ts';
import { PRISMATIC_SET_ID } from './PrismaticCatalog.ts';
import { prismaticSurfaceProgress } from './PrismaticSurfaces.ts';
import { jungleReadyHolos } from '../card/JungleCards.ts';
import { WIZARDS_PROMO_ID, wizardsPromoCards } from './WizardsPromoCatalog.ts';

/** Collation support and render readiness are independent. Never reroll away
 * from cards with missing surfaces or silently substitute another material.
 */
export function packAvailability(setId: string): { ready: boolean; label: string; detail: string } {
  const collection = collectionProductFor(setId);
  if (collection) return { ready: true, label: collection.kind === 'demonstration-collection' ? `Demo collection · ${collection.cardIds.length} cards · 2002` : `Collection available · ${collection.cardIds.length} fixed cards`, detail: collection.note };
  if (setId === WIZARDS_PROMO_ID) return { ready: false, label: `Browse ${wizardsPromoCards.length} promos`,
    detail: 'Choose an individual promo card. These cards were distributed outside booster packs.' };
  if (!recipeFor(setId)) return { ready: false, label: 'Browse only · recipe not validated',
    detail: 'Opening unavailable: this set has no validated pack recipe.' };
  if (setId === 'neo4') return { ready: true, label: 'Opening available', detail: '113 cards · 1st Edition · 16 Cosmos holos + 8 subject-foil Shining cards.' };
  if (setId === 'neo3') return { ready: true, label: 'Opening available', detail: '66 cards · 1st Edition · 16 supplied holo protections. Cosmos dot placements deferred to the next pass.' };
  if (setId === 'gym1') return { ready: true, label: 'Opening available', detail: '132 cards · 1st Edition · 19 registered Cosmos holos and four original booster designs.' };
  if (setId === 'gym2') return { ready: true, label: 'Opening available', detail: '132 cards · 1st Edition · 20 registered Cosmos holos and four original booster designs.' };
  if (setId === 'base5') return { ready: true, label: 'Opening available',
    detail: '83 cards · 1st Edition. 18 holos with registered foil, including secret rare Dark Raichu.' };
  if (setId === 'lc') return { ready: true, label: 'Opening available',
    detail: '110 English unlimited cards · 19 regular holos · one guaranteed reverse holo · four booster designs.' };
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
