import type { HolographicProfile } from '../HolographicProfile';

export const pokemonBreak: HolographicProfile = {
  id: 'pokemon-break', name: 'Pokémon BREAK', family: 'Pokémon', status: 'curated',
  description: 'Fixed diamond-shaped square optical domains with narrow silver flashes, faint spectral edges and separately masked printed gold.',
  opticalModel: 'pokemon-break',
  diffraction: { period: 1.12, bandwidth: .085, strength: .055, secondaryOrder: 0, direction: 0, crossWidth: .19 },
  structure: { field: 'break-squares', scale: 16.4, engraving: 0, relief: 0, patternRelief: 0,
    facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .88, roughness: .28, laminate: .08, laminateRoughness: .3,
    substrateDarkening: .99, substrateReflection: .12, foilReflectance: 0 },
  metallicInk: { roughness: .29, metalness: .55, environmentIntensity: .55 },
  mapSettings: { normalScale: 0, embossStrength: 0, embossMaskFromNormalAlpha: false, roughnessMode: 'absolute' },
};
