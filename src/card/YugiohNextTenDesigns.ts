import type { CardProfileOverrides } from '../materials/HolographicProfile';

/** Individual material settings for usage ranks 11–20. Physical-reference matching remains pending. */
export const nextTenDesigns: Record<string, CardProfileOverrides> = {
  'fydraulis-harmonia': {
    diffraction: { strength: 1.3, bandwidth: .03, crossing: .34, secondaryOrder: .12 },
    structure: { scale: 255, facetTilt: .58, reflectionCoupling: .22, gridStrength: .86, gridScale: 3.8, gridWidth: .13 },
    glints: { density: .25, strength: 9.5, sharpness: 370, spread: .31 },
    surface: { roughness: .27, metalness: .7, foilReflectance: .13, laminate: .2, laminateRoughness: .29 },
  },
  'golden-cloud-beast-malong': {
    diffraction: { strength: .46, bandwidth: .075, secondaryOrder: .05, direction: -.35, crossWidth: .54 },
    structure: { field: 'plain', scale: 1, engraving: .035, relief: 0, facetTilt: 0, reflectionCoupling: .18 },
    glints: { density: 0, strength: 0, sharpness: 300, spread: .2 },
    surface: { roughness: .27, metalness: .57, foilReflectance: .085, laminate: .28, laminateRoughness: .3 },
    metallicInk: { color: [.83, .51, .13], roughness: .23, metalness: .94 },
  },
  'chaos-angel': {
    diffraction: { strength: 1.52, bandwidth: .027, crossing: .36, secondaryOrder: .14 },
    structure: { scale: 255, facetTilt: .66, reflectionCoupling: .2, gridStrength: .92, gridScale: 3.8, gridWidth: .12 },
    glints: { density: .3, strength: 12, sharpness: 390, spread: .33 },
    surface: { roughness: .25, metalness: .73, foilReflectance: .145, laminate: .18, laminateRoughness: .3 },
  },
  'solemn-accusation': {
    diffraction: { strength: 1.16, bandwidth: .033, crossing: .34, secondaryOrder: .11 },
    structure: { scale: 255, facetTilt: .53, reflectionCoupling: .23, gridStrength: .82, gridScale: 3.8, gridWidth: .13 },
    glints: { density: .22, strength: 8, sharpness: 355, spread: .3 },
    surface: { roughness: .3, metalness: .65, foilReflectance: .105, laminate: .23, laminateRoughness: .28 },
  },
  'lava-golem': {
    diffraction: { strength: 1.42, bandwidth: .034, crossing: .5, secondaryOrder: .11 },
    structure: { scale: 290, facetTilt: .54, reflectionCoupling: .27, gridStrength: .65, gridScale: 7.2, gridWidth: .4 },
    glints: { density: .25, strength: 9, sharpness: 350, spread: .32 },
    surface: { roughness: .27, metalness: .7, foilReflectance: .125, laminate: .2, laminateRoughness: .28 },
  },
  'medius-the-pure': {
    diffraction: { strength: 1.04, bandwidth: .034, crossing: .33, secondaryOrder: .1 },
    structure: { scale: 255, facetTilt: .49, reflectionCoupling: .24, gridStrength: .78, gridScale: 3.8, gridWidth: .14 },
    glints: { density: .19, strength: 6.5, sharpness: 340, spread: .29 },
    surface: { roughness: .32, metalness: .63, foilReflectance: .095, laminate: .25, laminateRoughness: .28 },
  },
  'vidolium-power-patron': {
    diffraction: { strength: .5, bandwidth: .074, secondaryOrder: .055, direction: -.42, crossWidth: .56 },
    structure: { field: 'plain', scale: 1, engraving: .03, relief: 0, facetTilt: 0, reflectionCoupling: .16 },
    glints: { density: 0, strength: 0, sharpness: 300, spread: .2 },
    surface: { roughness: .28, metalness: .58, foilReflectance: .09, laminate: .27, laminateRoughness: .3 },
  },
  'prohibited-power-patron-portal': {
    diffraction: { strength: .42, bandwidth: .078, secondaryOrder: .045, direction: -.5, crossWidth: .58 },
    structure: { field: 'plain', scale: 1, engraving: .025, relief: 0, facetTilt: 0, reflectionCoupling: .15 },
    glints: { density: 0, strength: 0, sharpness: 300, spread: .2 },
    surface: { roughness: .3, metalness: .55, foilReflectance: .08, laminate: .29, laminateRoughness: .3 },
  },
  'ragged-records-of-rites': {
    diffraction: { strength: .45, bandwidth: .076, secondaryOrder: .05, direction: -.38, crossWidth: .55 },
    structure: { field: 'plain', scale: 1, engraving: .03, relief: 0, facetTilt: 0, reflectionCoupling: .17 },
    glints: { density: 0, strength: 0, sharpness: 300, spread: .2 },
    surface: { roughness: .29, metalness: .56, foilReflectance: .085, laminate: .28, laminateRoughness: .3 },
  },
  'junoldo-power-patron': {
    diffraction: { strength: 1.24, bandwidth: .031, crossing: .34, secondaryOrder: .12 },
    structure: { scale: 255, facetTilt: .57, reflectionCoupling: .22, gridStrength: .85, gridScale: 3.8, gridWidth: .13 },
    glints: { density: .24, strength: 9, sharpness: 365, spread: .31 },
    surface: { roughness: .28, metalness: .69, foilReflectance: .12, laminate: .21, laminateRoughness: .29 },
  },
};
