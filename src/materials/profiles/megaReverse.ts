import type { HolographicProfile } from '../HolographicProfile';

/** Unetched, finely textured reverse film, reviewed against the supplied
 * Perfect Order Snorlax 063/088 photo. Coverage remains printing-specific. */
export const megaReverse: HolographicProfile = {
  id: 'mega-standard-reverse', name: 'Mega Evolution · Textured reverse',
  family: 'Pokémon', status: 'development', opticalModel: 'mega-reverse',
  description: 'Fine irregular silver foil with continuous grain reflections and restrained directional color. Exact TCGL coverage protects artwork and print; no etched relief or isolated sparkle.',
  diffraction: { period: 1.16, bandwidth: .075, strength: .48, secondaryOrder: .025, direction: -.48, crossWidth: .48, facetCoupling: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .78, roughness: .25, laminate: .11, laminateRoughness: .18, foilReflectance: .025, substrateReflection: .24, substrateDarkening: .12, sheen: 0, inkTransmission: 1 },
  mapSettings: { normalScale: 0, embossStrength: 0, embossMaskFromNormalAlpha: false },
};
