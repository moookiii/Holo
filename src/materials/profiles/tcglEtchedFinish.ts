import type { CardProfileOverrides } from '../HolographicProfile';

/** Final Sylveon 156 / Espeon 155 response, applied to each card's own TCGL normal.
 * Region coverage stays in exact-card PNGs; absent secondary coverage stays absent.
 */
export const tcglEtchedFinish: CardProfileOverrides = {
  mapSettings: { normalScale: 1, embossStrength: 0, roughnessMode: 'absolute', embossMaskFromNormalAlpha: false },
  diffraction: { period: 1.16, bandwidth: .048, strength: .48, secondaryOrder: .065, direction: -.48, crossWidth: .42, facetCoupling: 0, followsAuthoredNormals: true },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .50, roughness: .32, laminate: .045, laminateRoughness: .27, foilReflectance: .025, sheen: 0, inkTransmission: .86, etchedInkSheen: .85, varnishRelief: 0, substrateDarkening: 0 },
  secondary: {
    diffraction: { period: 1.1, bandwidth: .045, strength: .46, secondaryOrder: .07, direction: -.48, crossWidth: .42, crossing: .18, facetCoupling: 0 },
    structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
    glints: { density: .94, scale: 620, sharpness: 125, strength: 10, spread: .46, microdiamond: true },
    surface: { metalness: .76, roughness: .27, laminate: .10, laminateRoughness: .24, foilReflectance: .055, inkTransmission: .72 },
  },
};
