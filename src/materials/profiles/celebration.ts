import type { HolographicProfile } from '../HolographicProfile';

/** Pikachu stock reconstructed from the user-supplied physical-card example.
 * Classic remains pending its own authored stock. No etched relief is generated. */
const stock: HolographicProfile = {
  id: 'celebration-pikachu-fireworks', name: '30th · Pikachu fireworks',
  family: 'Pokémon', status: 'reference-pending', labOnly: true,
  description: 'Fine radial fireworks on the reverse, with separate rainbow-speckled Pikachu silhouette and border.',
  opticalModel: 'celebration-pikachu',
  diffraction: { period: 1.16, bandwidth: .048, strength: .38, secondaryOrder: .065,
    direction: 0, crossWidth: .42, facetCoupling: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0,
    facetTilt: 0, normalVariance: 0, reflectionCoupling: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .65, roughness: .3, laminate: .08, laminateRoughness: .27,
    foilReflectance: .04, inkTransmission: .88 },
  mapSettings: { normalScale: 0, embossStrength: 0, roughnessMode: 'absolute' },
};
const speckles: HolographicProfile = {
  ...stock, id: 'celebration-pikachu-speckles', name: '30th · Pikachu rainbow speckles',
  description: 'Fixed reflective foil flakes inside the anniversary Pikachu silhouette, artwork foil and silver border.',
  diffraction: { ...stock.diffraction, strength: 1.45, crossWidth: .56, secondaryOrder: .12 },
  surface: { ...stock.surface, metalness: .8, inkTransmission: .55 },
};
export const celebrationSpecialtyProfiles: HolographicProfile[] = [{ ...stock, secondary: speckles }, speckles, {
  ...stock, id: 'celebration-classic-stock', name: '30th · Classic optical stock',
  opticalModel: 'celebration-classic',
  description: 'Separately masked Classic reflective stock. The card primary retains its exact TCGL normal and required etched finish.',
  diffraction: { ...stock.diffraction, strength: .48, crossWidth: .32 },
  surface: { ...stock.surface, metalness: .5, laminate: .045, foilReflectance: .025, roughness: .27, inkTransmission: .72 },
}];
