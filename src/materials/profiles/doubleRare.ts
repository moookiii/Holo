import type { HolographicProfile } from '../HolographicProfile';

/** TCGL SUN_PILLAR / HOLO coverage plus the reference's cast-and-cure star
 * optical layer. The star texture never participates in coverage composition. */
export const doubleRareProfile: HolographicProfile = {
  id: 'sv-double-rare', name: 'Scarlet & Violet · Double Rare', family: 'Pokémon', status: 'development',
  opticalModel: 'sv-double-rare',
  description: 'Diagonal SUN_PILLAR reflection and reference-registered cast-and-cure stars, inside unchanged TCGL foil coverage.',
  maps: { direction: '/materials/sv-double-rare-stars.png' },
  mapSettings: { normalScale: 0, embossStrength: 0 },
  diffraction: { period: 1.18, bandwidth: .045, strength: .52, secondaryOrder: .025, direction: -Math.PI / 4, crossWidth: .27, facetCoupling: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .38, roughness: .28, laminate: .055, laminateRoughness: .28,
    foilReflectance: .008, inkTransmission: 1, inkDensity: 1, substrateReflection: .22, sheen: 0 },
};
