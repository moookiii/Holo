import type { HolographicProfile } from '../HolographicProfile';

/** Shared modern promo sheet. Placements are intentionally common to these
 * clean TCGL fronts; scanned vintage Cosmos cards keep their registered maps. */
export const svpCosmos: HolographicProfile = {
  id: 'svp-cosmos', name: 'SVP Cosmos', family: 'Pokémon', status: 'development',
  description: 'SV promotional Cosmos sheet: unequal circles, rosettes and a broken swirl, with restrained silver backing and small angular flashes inside exact TCGL coverage.',
  diffraction: { period: 1.40, bandwidth: .062, strength: 1.05, secondaryOrder: .10, direction: 0, crossWidth: .46, facetCoupling: 1 },
  structure: { field: 'cosmos', scale: 26, engraving: 0, relief: 0, patternRelief: 0, facetTilt: .65, reflectionCoupling: .12, normalVariance: 0 },
  glints: { density: .035, scale: 520, sharpness: 220, strength: 3, spread: .46 },
  surface: { metalness: .72, roughness: .30, laminate: .12, laminateRoughness: .30,
    foilReflectance: .11, inkTransmission: .42, substrateReflection: .55, sheen: .12 },
  mapSettings: { normalScale: 0, embossStrength: 0 },
};
