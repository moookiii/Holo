import type { HolographicProfile } from '../HolographicProfile';

/** English SM Prism Star: one continuous optical sheet, clipped by exact print coverage.
 * Optical inclinations are not embossed surface normals. See docs/prism-star-finish-research.md.
 */
export const prismStar: HolographicProfile = {
  id: 'pokemon-sm-prism-star', name: 'Sun & Moon Prism Star', family: 'Pokémon', status: 'curated', extendedCoverage: true,
  description: 'Smooth oblique wave foil shared by artwork, diamond and dark border. The central star and opaque print retain their TCGL protection; no glitter or raised geometry.',
  diffraction: { period: 1.24, bandwidth: .065, strength: .64, secondaryOrder: .08, direction: 0, crossWidth: .47, facetCoupling: 1 },
  structure: { field: 'sm-prism-star', scale: 1, reflectionCoupling: .14, engraving: 0, relief: 0, patternRelief: 0, facetTilt: .9, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 300, strength: 0, spread: 0 },
  surface: { metalness: .78, roughness: .30, laminate: .18, laminateRoughness: .33, foilReflectance: .09, sheen: 0, inkTransmission: .75, varnishRelief: 0 },
  mapSettings: { normalScale: 0, embossStrength: 0, embossMaskFromNormalAlpha: false, roughnessMode: 'profile' },
};
