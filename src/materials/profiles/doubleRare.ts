import type { HolographicProfile } from '../HolographicProfile';

/** TCGL SUN_PILLAR / HOLO. The printing's existing foil PNG supplies all
 * spatial detail (including Southern Cross stars); never synthesize a die. */
export const doubleRareProfile: HolographicProfile = {
  id: 'sv-double-rare', name: 'Scarlet & Violet · Double Rare', family: 'Pokémon', status: 'development',
  opticalModel: 'sv-double-rare',
  description: 'Source-driven SUN_PILLAR foil beneath printed ink, with selective direct-light reflection and no procedural cuts or stars.',
  mapSettings: { normalScale: 0, embossStrength: 0 },
  diffraction: { period: 1.18, bandwidth: .028, strength: .95, secondaryOrder: .025, direction: 0, crossWidth: .16, facetCoupling: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .38, roughness: .28, laminate: .055, laminateRoughness: .28,
    foilReflectance: .008, inkTransmission: 1, inkDensity: 1, substrateReflection: .22, sheen: 0 },
};
