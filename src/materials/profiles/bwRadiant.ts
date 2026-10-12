import type { HolographicProfile } from '../HolographicProfile';

/** Smooth RC stock: distinct foil chips throughout, larger glitter below.
 * The exact card plate supplies decoration and opaque print boundaries.
 * Grain inclinations are optical only; neither layer changes surface normals. */
const glitter: HolographicProfile = {
  id: 'bw-radiant-glitter', name: 'BW Radiant Collection · Glitter', family: 'Pokémon', status: 'development',
  description: 'Sparse irregular foil chips with a coherent spectral sweep in the coating above the print, larger lower-card flakes and a restrained clear overcoat.',
  diffraction: { period: 1.16, bandwidth: .048, strength: .025, secondaryOrder: .025, direction: -.48, crossWidth: .42, facetCoupling: 0, normalFiltering: 1 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: .42, scale: 58, sharpness: 85, strength: 4.8, spread: .42, metallicGrain: true, spectralGrain: true, foilFlakes: true },
  surface: { metalness: .32, roughness: .38, laminate: .22, laminateRoughness: .28, foilReflectance: .018, inkTransmission: .32, substrateReflection: .55 },
  mapSettings: { normalScale: 0, embossStrength: 0, roughnessMode: 'profile', embossMaskFromNormalAlpha: false },
};
glitter.secondary = {
  diffraction: { ...glitter.diffraction, strength: .015 },
  structure: { ...glitter.structure },
  glints: { ...glitter.glints, density: .28, scale: 49, sharpness: 85, strength: 4.8, spread: .42 },
  surface: { ...glitter.surface, metalness: .30, roughness: .38, foilReflectance: .018 },
};

export const bwRadiantProfiles: HolographicProfile[] = [glitter, {
  ...glitter, id: 'bw-radiant-overcoat', name: 'BW Radiant Collection · Star overcoat',
  description: 'Subtle angular stars in clear coating above the common-card print. TCGL supplies no whiteplate for these ten records; the star sheet is an authored approximation.',
  diffraction: { ...glitter.diffraction, strength: .42, bandwidth: .06 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { ...glitter.surface, metalness: 0, roughness: .48, laminate: .52, laminateRoughness: .24, foilReflectance: 0, inkTransmission: .92, substrateReflection: 1 },
  secondary: undefined,
}];
