import type { HolographicProfile } from '../HolographicProfile';

/** Preserved October 2026 Line optics; keep the legacy vertical-line field unchanged. */
export const luminousLines: HolographicProfile = {
  id: 'luminous-lines', name: 'Luminous Lines', family: 'Original', status: 'reference-pending',
  description: 'Sword & Shield-style unequal fine vertical cuts with top-to-bottom optical selection. Individual columns retain silver highlights while shared spectral bands change with tilt.',
  diffraction: { period: 1.18, bandwidth: .037, strength: 1.9, secondaryOrder: .10, direction: 0, crossWidth: .44, facetCoupling: 1 },
  structure: { field: 'vertical-line', scale: 310, engraving: .10, relief: 0, facetTilt: .95, normalVariance: .40 },
  glints: { density: .009, scale: 700, sharpness: 340, strength: 1.1, spread: .20 },
  surface: { metalness: .84, roughness: .25, laminate: .18, laminateRoughness: .32, foilReflectance: .21, sheen: .44 },
};
