import type { HolographicProfile } from '../HolographicProfile';

/** Worlds 11/12/13 lettering: exact own TCGL whiteplate, smooth foil. */
export const bwStamped: HolographicProfile = {
  id: 'bw-stamped', name: 'BW Worlds stamp', family: 'Pokémon', status: 'development',
  description: 'Localized spectral Worlds lettering over coated printed artwork. Exact per-card glyph coverage; smooth metal with no etched relief.',
  diffraction: { period: 1.16, bandwidth: .048, strength: .65, secondaryOrder: .04, direction: -.48, crossWidth: .42, facetCoupling: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .78, roughness: .30, laminate: .12, laminateRoughness: .25, foilReflectance: .07, inkTransmission: .8 },
  mapSettings: { normalScale: 0, embossStrength: 0, roughnessMode: 'absolute', embossMaskFromNormalAlpha: false },
};
