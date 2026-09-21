import type { HolographicProfile } from '../HolographicProfile';

/** Non-diffractive conductor. Coverage B selects gold; G in the surface map selects finish. */
export const mintedGold: HolographicProfile = {
  id: 'minted-gold', name: '23K minted gold', family: 'Pokémon', status: 'reference-pending', labOnly: true,
  description: 'Gold-plated solid metal: polished raised relief, satin fields and engraved recesses. No diffraction or thin film.',
  diffraction: { period: 1, bandwidth: .05, strength: 0, secondaryOrder: 0, direction: 0, crossWidth: .3 },
  structure: { field: 'plain', engraving: 0, scale: 1, relief: 0 },
  glints: { density: 0, scale: 1, sharpness: 100, strength: 0, spread: 0 },
  surface: { metalness: 1, roughness: .28, laminate: 0, laminateRoughness: .3, iridescence: 0 },
  // Linear gold reflectance, not an sRGB paint tint.
  metallicInk: { color: [1, .76, .36], roughness: .23, metalness: 1, environmentIntensity: 1.15, recess: .16, normalFiltering: .2 },
};
