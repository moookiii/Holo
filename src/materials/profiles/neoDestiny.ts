import type { HolographicProfile } from '../HolographicProfile';

/** Subject foil seen in the supplied moving Shining Charizard reference.
 * Optical grain only: no invented height field or etched line geometry. */
export const neoDestinyShining: HolographicProfile = {
  id: 'pokemon-neo-destiny-shining', name: 'Neo Destiny · Shining silver',
  family: 'Pokémon', status: 'development',
  description: 'Subject-only silver metallic foil with fine fixed grain, responsive to the light and card angle. Each printing supplies its own coverage and print protection.',
  diffraction: { period: 1.3, bandwidth: .075, strength: 0, secondaryOrder: 0, direction: 0, crossWidth: .5, facetCoupling: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: .98, scale: 920, sharpness: 85, strength: .38, spread: .24, metallicGrain: true },
  surface: { metalness: .66, roughness: .30, laminate: .045, laminateRoughness: .34, foilReflectance: .075, inkTransmission: .72, substrateReflection: .35, sheen: .08 },
  mapSettings: { normalScale: 0, embossStrength: 0 },
};
