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
}, {
  id: 'prismatic_ace_spec', name: 'Prismatic · ACE SPEC', family: 'Pokémon', status: 'development',
  description: 'Prismatic ACE SPEC horizontal foil strands form broad diamond reflections beneath colored ink. Each card supplies its own opaque device casing, transmissive windows and text protection. Magenta is printed ink, and the sheet has no raised etched relief.',
  diffraction: { period: 1.15, bandwidth: .052, strength: .65, secondaryOrder: .10, direction: 0, crossWidth: .45, facetCoupling: 1 },
  structure: { field: 'ace-spec', scale: 440, engraving: 0, relief: 0, facetTilt: .85, reflectionCoupling: .18, normalVariance: .12 },
  glints: { density: 0, scale: 610, sharpness: 280, strength: 0, spread: .20 },
  surface: { metalness: .72, roughness: .31, laminate: .20, laminateRoughness: .30, foilReflectance: .09, sheen: 0, inkTransmission: 1 },
}];
