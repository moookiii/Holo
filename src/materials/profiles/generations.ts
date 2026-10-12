import type { HolographicProfile } from '../HolographicProfile';

/** Generations RC is smooth FlatSilver, not BW RC glitter or etched EX stock.
 * All decorative geometry and print exclusions come from each TCGL plate. */
const regular: HolographicProfile = {
  id: 'generations-rc-ex', name: 'Generations RC · EX silver', family: 'Pokémon', status: 'development',
  description: 'Smooth silver beneath the exact RC hearts, stars and selective artwork plate. No synthesized sparkle, relief or rainbow overlay.',
  diffraction: { period: 1.16, bandwidth: .048, strength: 0, secondaryOrder: 0, direction: 0, crossWidth: .42, facetCoupling: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .68, roughness: .30, laminate: .055, laminateRoughness: .3, foilReflectance: .045, inkTransmission: .92, coverageRoughness: .08, sheen: 0 },
  mapSettings: { normalScale: 0, embossStrength: 0, roughnessMode: 'profile', embossMaskFromNormalAlpha: false },
};
export const generationsProfiles: HolographicProfile[] = [regular, {
  ...regular, id: 'generations-rc-holo', name: 'Generations RC · Decorative silver holo',
  surface: { ...regular.surface, metalness: .72, roughness: .32, foilReflectance: .055 },
}];
