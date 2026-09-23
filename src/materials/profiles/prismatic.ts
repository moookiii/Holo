import type { HolographicProfile } from '../HolographicProfile';

/** Prismatic retail surfaces. Coverage is always supplied by an exact printing.
 * Textured families must be added only with their photographed, authored maps.
 */
export const prismaticProfiles: HolographicProfile[] = [{
  id: 'prismatic_regular_holo', name: 'Prismatic · Regular holo', family: 'Pokémon', status: 'development',
  description: 'Smooth Scarlet & Violet horizontal holo sheet in the authored picture/background and silver rim. Opaque subject, evolution portrait, printed framing and rules stay protected. No raised etching.',
  diffraction: { period: 1.17, bandwidth: .065, strength: .16, secondaryOrder: .05, direction: 0, crossWidth: .42, facetCoupling: 1 },
  structure: { field: 'mirage', scale: 940, reflectionCoupling: .07, engraving: 0, relief: 0, facetTilt: .65, normalVariance: .10 },
  glints: { density: 0, scale: 780, sharpness: 340, strength: 0, spread: .16 },
  surface: { metalness: .68, roughness: .30, laminate: .20, laminateRoughness: .31, foilReflectance: .055, sheen: 0 },
}];
