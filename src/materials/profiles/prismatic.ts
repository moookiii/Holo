import type { HolographicProfile } from '../HolographicProfile';

/** Prismatic retail surfaces. Coverage is always supplied by an exact printing.
 * Textured candidates stay Lab-only until exact-card maps pass visual review.
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
}, {
  id: 'prismatic_fullart_texture', name: 'Prismatic · Full-art etched', family: 'Pokémon', status: 'development', labOnly: true,
  description: 'Scarlet & Violet full-art Trainer foil under colored ink. A uniform sheet direction drives diffraction, while card-specific PNG height and normal maps supply photo-guided etched relief. Ridge placement and depth are reconstructed approximations. Atticus 133 is authored. Other full arts still need their own maps.',
  diffraction: { period: 1.18, bandwidth: .032, strength: .48, secondaryOrder: .04, direction: -.55, crossWidth: .22, facetCoupling: 0, followsAuthoredNormals: true },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .70, roughness: .34, laminate: .06, laminateRoughness: .26, foilReflectance: .025, sheen: 0, inkTransmission: 1 },
  mapSettings: { normalScale: 1.35, embossStrength: 0, roughnessMode: 'absolute' },
}];
