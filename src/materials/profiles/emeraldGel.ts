import { masterPrism, type HolographicProfile } from '../HolographicProfile';
export const emeraldGel: HolographicProfile = {
  ...masterPrism,
  id: 'emerald-gel', name: 'Emerald Gel', family: 'Original', status: 'development',
  description: 'Deep emerald pools and selective jade-to-lime diffraction ribbons beneath a smooth wet-look laminate. Green absorption and printed-ink transmission keep the gel rich through changing light.',
  // Match Master Prism's spectral precision, with a slightly softer gel response.
  // Absorption belongs to the foil as well as the print, so the finish stays green.
  diffraction: { ...masterPrism.diffraction, period: 1.3, bandwidth: .04, strength: 1.05,
    crossWidth: .27, secondaryOrder: .02, direction: .25, tint: [.24, 1, .32] },
  // A continuous axis field avoids the liquid field's converging pinwheel points.
  structure: { field: 'silk', scale: 10, engraving: 0, relief: 0, facetTilt: 0, patternRelief: 0, normalVariance: 0 },
  glints: { ...masterPrism.glints, density: 0, strength: 0, spread: 0 },
  surface: { ...masterPrism.surface, metalness: .62, roughness: .28,
    laminate: .58, laminateRoughness: .17,
    foilReflectance: .04, inkTransmission: .88, inkDensity: 1,
    substrateReflection: .16, anisotropy: .24 },
};
