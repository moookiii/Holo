import type { HolographicProfile } from '../HolographicProfile';

export const printOnly: HolographicProfile = {
  id: 'print-only', name: 'Print only', family: 'Original', status: 'development', labOnly: true,
  description: 'Coated printed card stock without diffraction. Used when no verified foil treatment is assigned.',
  diffraction: { period: 1, bandwidth: .05, strength: 0, secondaryOrder: 0, direction: 0, crossWidth: .3 },
  structure: { field: 'radial', engraving: 0, scale: 1, relief: 0 },
  glints: { density: 0, scale: 1, sharpness: 100, strength: 0, spread: 0 },
  surface: { metalness: 0, roughness: .48, laminate: .45, laminateRoughness: .25 },
};
