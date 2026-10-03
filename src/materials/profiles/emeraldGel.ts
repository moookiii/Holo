import type { HolographicProfile } from '../HolographicProfile';
export const emeraldGel: HolographicProfile = {
  id: 'emerald-gel', name: 'Emerald Gel', family: 'Original', status: 'development',
  description: 'Smooth liquid diffraction filtered through green slime ink, with emerald pools, lime ribbons and controlled glossy highlights.',
  diffraction: { period: 1.3, bandwidth: .055, strength: .9, crossWidth: .38, secondaryOrder: 0, direction: .25 },
  structure: { field: 'liquid', scale: 10, engraving: 0, relief: 0, facetTilt: 0, patternRelief: 0, normalVariance: 0 },
  glints: { density: 0, scale: 310, sharpness: 280, strength: 0, spread: 0 },
  surface: { metalness: .55, roughness: .29, laminate: .22, laminateRoughness: .23,
    foilReflectance: .035, inkTransmission: 1, inkDensity: 1, substrateReflection: .12, anisotropy: .2 },
};
