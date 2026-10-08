import type { HolographicProfile } from '../HolographicProfile';

const base: HolographicProfile = {
  id: 'bw-pokeball-reverse', name: 'Black & White · Poké Ball reverse', family: 'Pokémon', status: 'development',
  opticalModel: 'sv-ball-reverse',
  description: 'Continuous TCGL silver reverse coverage with smooth registered Poké Ball cast-and-cure color. No sparkle or etched relief.',
  diffraction: { period: 1.22, bandwidth: .047, strength: .94, secondaryOrder: .035, direction: Math.PI / 2, crossWidth: .72, facetCoupling: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 650, sharpness: 110, strength: 0, spread: .25, metallicGrain: true },
  surface: { metalness: .52, roughness: .29, laminate: .065, laminateRoughness: .29, foilReflectance: .028,
    substrateReflection: .48, inkTransmission: .48, sheen: 0 },
  mapSettings: { normalScale: 0, embossStrength: 0 },
};
export const bwBallReverseProfiles: HolographicProfile[] = [base, {
  ...base, id: 'bw-masterball-reverse', name: 'Black & White · Master Ball reverse',
  description: 'Registered Master Ball cast-and-cure film over continuous TCGL silver coverage, with restrained rainbow sheen and fine cap flashes.',
  diffraction: { ...base.diffraction, strength: .76, bandwidth: .042 },
  glints: { ...base.glints, density: .92, strength: 8, spread: .23 },
}];
