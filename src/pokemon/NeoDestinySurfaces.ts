import type { CardMapPaths } from '../card/CardDefinition.ts';
/** Dedicated subject-only route. Reuses an existing plain foil response until
 * the explicitly deferred Shining shader pass. Never routes through Cosmos,
 * generates relief, or infers coverage from the printed front. */
export const neoDestinyShiningSurface = {
  profile: 'pokemon-team-rocket-trainer',
  maps(localId: string): CardMapPaths {
    const base = `/cards/pokemon/neo-destiny/maps/${localId}`;
    return { foil: `${base}-foil.png`, protection: `${base}-protection.png` };
  },
};
