import type { HolographicProfile } from '../HolographicProfile';
export const phantomCorridor: HolographicProfile = {
  id: 'phantom-corridor', name: 'Phantom Corridor', family: 'Original', status: 'development',
  description: 'Fine curved perspective flutes carry controlled spectral reflections through the corridor around opaque character ink.',
  diffraction: { period: 1.19, bandwidth: .032, strength: .72, secondaryOrder: .025, direction: -.42, crossWidth: .22, facetCoupling: 0, followsAuthoredNormals: true },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .65, roughness: .31, laminate: .22, laminateRoughness: .25, foilReflectance: .035, inkTransmission: .78, etchedInkSheen: .9, substrateReflection: .12 },
  mapSettings: { normalScale: 1, embossStrength: 0, roughnessMode: 'absolute' },
};
