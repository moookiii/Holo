import type { CardMapPaths } from '../card/CardDefinition.ts';
/** Dedicated subject-only silver foil. Coverage comes from authored PNGs,
 * never from front brightness or an artwork-window Cosmos material. */
export const neoDestinyShiningSurface = {
  profile: 'pokemon-neo-destiny-shining',
  maps(localId: string): CardMapPaths {
    const base = `/cards/pokemon/neo-destiny/maps/${localId}`;
    return { foil: `${base}-foil.png`, protection: `${base}-protection.png` };
  },
};
