import type { HolographicProfile } from '../HolographicProfile';

/** All spatial detail comes from registered PNG dies, as in Nocturne's maps. */
export const signalForestEtched: HolographicProfile = {
  id: 'signal-forest-etched', name: 'Signal Forest · intaglio foil', family: 'Original', status: 'development',
  description: 'Source-registered microcuts and data dots in satin black print. A uniform optical sheet follows the authored die normals, revealing narrow spectral reflections under movement.',
  diffraction: { period: 1.16, bandwidth: .025, strength: .7, secondaryOrder: .025, direction: -.48, crossWidth: .2, facetCoupling: 0, followsAuthoredNormals: true },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .65, roughness: .34, laminate: .18, laminateRoughness: .27, foilReflectance: .025, inkTransmission: .84, etchedInkSheen: 1.3, substrateReflection: .14 },
  mapSettings: { normalScale: 1, embossStrength: 0, roughnessMode: 'absolute' },
};
