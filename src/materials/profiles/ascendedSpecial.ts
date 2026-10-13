import type { HolographicProfile } from '../HolographicProfile';
import { TCGL_FLAT_SILVER_PATHS } from '../TcglFlatSilverResources';

/** Original TCGL FlatSilver program and resources, only for ASC ph2 printings. */
export const ascendedSpecial: HolographicProfile = {
  id: 'ascended-special-reverse', name: 'Ascended Heroes · Ball / Team Rocket reverse',
  family: 'Pokémon', status: 'curated', opticalModel: 'tcgl-flat-silver',
  description: 'Original TCGL card-specific whiteplate with shared FlatSilver spectrum and moving shine. No generated pattern or etched relief.',
  // Existing cached data-map slots hold the two shared original samplers.
  maps: { direction: TCGL_FLAT_SILVER_PATHS.shine, secondaryDirection: TCGL_FLAT_SILVER_PATHS.spectrum },
  mapSettings: { normalScale: 0, embossStrength: 0, embossMaskFromNormalAlpha: false },
  diffraction: { period: 1, bandwidth: 0, strength: 0, secondaryOrder: 0, direction: 0, crossWidth: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .8, roughness: 0, laminate: 0, laminateRoughness: 0, inkTransmission: 1, substrateReflection: 0, sheen: 0 },
};
