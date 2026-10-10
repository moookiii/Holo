import type { HolographicProfile } from '../HolographicProfile';

/** Finish definitions only. Exact Energy cells and print exclusions come from
 * the printing's TCGL whiteplate, never a generated symbol layout. */
export const swshProfiles: HolographicProfile[] = [{
  id: 'swsh-reverse-energy', name: 'Sword & Shield · Energy reverse', family: 'Pokémon',
  status: 'development', labOnly: true,
  description: 'Neutral silver reverse film with the exact printing’s repeating Energy chevrons carried by its TCGL foil map. No rainbow sheen, emboss or generated symbols.',
  diffraction: { period: 1.16, bandwidth: .048, strength: 0, secondaryOrder: 0, direction: 0, crossWidth: .42, facetCoupling: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .78, roughness: .3, laminate: .08, laminateRoughness: .3, foilReflectance: .065, inkTransmission: .9, coverageRoughness: .18, sheen: 0 },
  mapSettings: { normalScale: 0, embossStrength: 0, roughnessMode: 'absolute', embossMaskFromNormalAlpha: false },
}];
