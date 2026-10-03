import type { HolographicProfile } from '../HolographicProfile';

export const dividedHeartEtched: HolographicProfile = {
  id: 'divided-heart-etched', name: 'Divided Heart · engraved silk', family: 'Original', status: 'development',
  description: 'Fine cloth crosscuts, bowed hair ridges, swept halo rays and feather cuts carry restrained moving spectral light. Smooth face, hands and golden hair preserve opaque ink.',
  diffraction: { period: 1.18, bandwidth: .031, strength: .57, secondaryOrder: .025, direction: -.43, crossWidth: .24, facetCoupling: 0, followsAuthoredNormals: true },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .64, roughness: .32, laminate: .16, laminateRoughness: .28, foilReflectance: .026, inkTransmission: .86, etchedInkSheen: 1.1, substrateReflection: .10 },
  mapSettings: { normalScale: 1, embossStrength: 0, roughnessMode: 'absolute' },
};
