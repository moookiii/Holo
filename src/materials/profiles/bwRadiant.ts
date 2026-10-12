import type { HolographicProfile } from '../HolographicProfile';

/** Smooth RC stock: fine foil in the picture, larger rounded glitter below.
 * The exact card plate supplies decoration and opaque print boundaries.
 * Grain inclinations are optical only; neither layer changes surface normals. */
const glitter: HolographicProfile = {
  id: 'bw-radiant-glitter', name: 'BW Radiant Collection · Glitter', family: 'Pokémon', status: 'development',
  description: 'Fine spectral glitter beneath the own decorative whiteplate, with larger lower-card particles and a smooth clear overcoat.',
  diffraction: { period: 1.16, bandwidth: .048, strength: .18, secondaryOrder: .025, direction: -.48, crossWidth: .42, facetCoupling: 0, normalFiltering: 1 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: .86, scale: 680, sharpness: 180, strength: 3.2, spread: .36, metallicGrain: true, spectralGrain: true },
  surface: { metalness: .52, roughness: .32, laminate: .45, laminateRoughness: .24, foilReflectance: .035, inkTransmission: .82, substrateReflection: .55 },
  mapSettings: { normalScale: 0, embossStrength: 0, roughnessMode: 'profile', embossMaskFromNormalAlpha: false },
};
glitter.secondary = {
  diffraction: { ...glitter.diffraction, strength: .10 },
  structure: { ...glitter.structure },
  glints: { ...glitter.glints, density: .62, scale: 155, sharpness: 110, strength: 6, spread: .65 },
  surface: { ...glitter.surface, metalness: .40, roughness: .36, foilReflectance: .025 },
};

export const bwRadiantProfiles: HolographicProfile[] = [glitter, {
  ...glitter, id: 'bw-radiant-overcoat', name: 'BW Radiant Collection · Star overcoat',
  description: 'Subtle angular stars in clear coating above the common-card print. TCGL supplies no whiteplate for these ten records; the star sheet is an authored approximation.',
  diffraction: { ...glitter.diffraction, strength: .42, bandwidth: .06 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { ...glitter.surface, metalness: 0, roughness: .48, laminate: .52, laminateRoughness: .24, foilReflectance: 0, inkTransmission: .92, substrateReflection: 1 },
  secondary: undefined,
}];
