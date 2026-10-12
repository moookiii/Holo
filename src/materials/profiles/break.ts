import type { HolographicProfile } from '../HolographicProfile';

export const pokemonBreak: HolographicProfile = {
  id: 'pokemon-break', name: 'Pok\u00e9mon BREAK', family: 'Pok\u00e9mon', status: 'curated',
  description: 'Card-aligned square fan gratings with rotating rainbow sectors, silver flashes and separately masked printed gold.',
  opticalModel: 'pokemon-break',
  diffraction: { period: 1.16, bandwidth: .025, strength: 3.2, secondaryOrder: .24, direction: 0, crossWidth: .19 },
  structure: { field: 'break-squares', scale: 16.4, engraving: 0, relief: 0, patternRelief: 0,
    facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .98, roughness: .28, laminate: .08, laminateRoughness: .3,
    substrateDarkening: 0, substrateReflection: .85, foilReflectance: .04, inkSpecular: .8 },
  metallicInk: { roughness: .29, metalness: .55, environmentIntensity: .55 },
  mapSettings: { normalScale: 0, embossStrength: 0, embossMaskFromNormalAlpha: false, roughnessMode: 'absolute' },
};
