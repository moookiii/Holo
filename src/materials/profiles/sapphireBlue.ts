import { masterPrism, type HolographicProfile } from '../HolographicProfile';

export const sapphireBlue: HolographicProfile = {
  ...masterPrism,
  id: 'sapphire-blue', name: 'Sapphire Blue', family: 'Original', status: 'development',
  description: 'Deep sapphire foil with precise ice-blue ribbons beneath a polished clear laminate. Selective angular color and restrained silver reflection preserve the printed artwork.',
  // Master Prism's narrow spectral response, tuned for a blue absorbing film.
  // The continuous silk axis moves the ribbons without inventing etched relief.
  diffraction: { ...masterPrism.diffraction, period: 1.24, bandwidth: .036, strength: 1.05,
    secondaryOrder: .025, direction: -.35, crossWidth: .25, tint: [.035, .32, 1] },
  structure: { field: 'silk', scale: 14, engraving: 0, relief: 0, facetTilt: 0,
    patternRelief: 0, normalVariance: 0 },
  glints: { ...masterPrism.glints, density: 0, strength: 0 },
  surface: { ...masterPrism.surface, metalness: .72, roughness: .27,
    laminate: .52, laminateRoughness: .16,
    foilReflectance: .045, anisotropy: .32, substrateReflection: .24 },
};
