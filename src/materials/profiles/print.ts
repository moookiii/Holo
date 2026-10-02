import type { HolographicProfile } from '../HolographicProfile';

export const printOnly: HolographicProfile = {
  id: 'print-only', name: 'Print only', family: 'Original', status: 'development', labOnly: true,
  description: 'Coated printed card stock without diffraction. Used when no verified foil treatment is assigned.',
  diffraction: { period: 1, bandwidth: .05, strength: 0, secondaryOrder: 0, direction: 0, crossWidth: .3 },
  structure: { field: 'radial', engraving: 0, scale: 1, relief: 0 },
  glints: { density: 0, scale: 1, sharpness: 100, strength: 0, spread: 0 },
  surface: { metalness: 0, roughness: .48, laminate: .45, laminateRoughness: .25 },
};

/** Coated print with localized, non-diffractive gold lettering. */
export const firstMovieGold: HolographicProfile = {
  ...printOnly, id: 'pokemon-first-movie-gold', name: 'First Movie gold stamp', family: 'Pokémon',
  description: 'Wizards First Movie upright gold lettering over ordinary printed artwork.',
  metallicInk: { color: [.83, .51, .13], roughness: .24, metalness: .96 },
};
