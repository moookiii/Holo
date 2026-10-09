import type { HolographicProfile } from '../HolographicProfile';

/** Stock evaluators consume registered PNG optical fields. These are deliberately
 * absent from the public treatment picker until the exact stock is supplied. */
const stock: HolographicProfile = {
  id: 'celebration-pikachu-fireworks', name: '30th · Pikachu fireworks',
  family: 'Pokémon', status: 'reference-pending', labOnly: true,
  description: 'Texture-driven anniversary fireworks; RG axes, B pitch, A motif coverage. Requires authored stock.',
  opticalModel: 'celebration-pikachu',
  diffraction: { period: 1.16, bandwidth: .048, strength: .48, secondaryOrder: .065,
    direction: 0, crossWidth: .32, facetCoupling: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0,
    facetTilt: 0, normalVariance: 0, reflectionCoupling: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .5, roughness: .3, laminate: .045, laminateRoughness: .27,
    foilReflectance: .025, inkTransmission: .85 },
  mapSettings: { normalScale: 0, embossStrength: 0, roughnessMode: 'absolute' },
};
export const celebrationSpecialtyProfiles: HolographicProfile[] = [stock, {
  ...stock, id: 'celebration-classic-stock', name: '30th · Classic optical stock',
  opticalModel: 'celebration-classic',
  description: 'Separately masked Classic reflective stock. The card primary retains its exact TCGL normal and required etched finish.',
  surface: { ...stock.surface, roughness: .27, inkTransmission: .72 },
}];
