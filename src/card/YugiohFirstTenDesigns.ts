import type { CardProfileOverrides } from '../materials/HolographicProfile';

/** First material pass; deliberately scoped to these printings. Angular reference matching is pending. */
export const firstTenDesigns: Record<string, CardProfileOverrides> = {
  'mulcharmy-fuwalos': {
    diffraction: { strength: 1.22, bandwidth: .038, crossing: .48, secondaryOrder: .10 },
    structure: { scale: 290, facetTilt: .48, reflectionCoupling: .3, gridStrength: .58, gridScale: 7.2, gridWidth: .4 },
    glints: { density: .22, strength: 7, sharpness: 320, spread: .3 },
    surface: { roughness: .29, metalness: .67, foilReflectance: .105, laminate: .22, laminateRoughness: .27 },
  },
  'mulcharmy-purulia': {
    diffraction: { strength: 1.08, bandwidth: .04, crossing: .48, secondaryOrder: .10 },
    structure: { scale: 290, facetTilt: .44, reflectionCoupling: .3, gridStrength: .58, gridScale: 7.2, gridWidth: .4 },
    glints: { density: .2, strength: 6, sharpness: 320, spread: .3 },
    surface: { roughness: .31, metalness: .64, foilReflectance: .095, laminate: .22, laminateRoughness: .27 },
  },
  'solemn-judgment': {
    diffraction: { strength: 1.36, bandwidth: .029, crossing: .34, secondaryOrder: .12 },
    structure: { scale: 255, facetTilt: .6, reflectionCoupling: .22, gridStrength: .86, gridScale: 3.8, gridWidth: .13 },
    glints: { density: .27, strength: 10, sharpness: 370, spread: .32 },
    surface: { roughness: .27, metalness: .7, foilReflectance: .13, laminate: .2, laminateRoughness: .29 },
  },
  'pot-of-sloth': {
    diffraction: { strength: 1.18, bandwidth: .032, crossing: .34, secondaryOrder: .12 },
    structure: { scale: 255, facetTilt: .54, reflectionCoupling: .22, gridStrength: .82, gridScale: 3.8, gridWidth: .13 },
    glints: { density: .23, strength: 8, sharpness: 350, spread: .32 },
    surface: { roughness: .3, metalness: .66, foilReflectance: .11, laminate: .23, laminateRoughness: .28 },
  },
  'sp-little-knight': {
    diffraction: { strength: 1.36, bandwidth: .034, crossing: .48, secondaryOrder: .10 },
    structure: { scale: 290, facetTilt: .5, reflectionCoupling: .28, gridStrength: .62, gridScale: 7.2, gridWidth: .4 },
    glints: { density: .24, strength: 8, sharpness: 340, spread: .3 },
    surface: { roughness: .28, metalness: .69, foilReflectance: .12, laminate: .2, laminateRoughness: .28 },
  },
  'harpies-feather-duster': {
    diffraction: { strength: 1.2, bandwidth: .032, crossing: .34, secondaryOrder: .12 },
    structure: { scale: 255, facetTilt: .55, reflectionCoupling: .22, gridStrength: .84, gridScale: 3.8, gridWidth: .13 },
    glints: { density: .24, strength: 9, sharpness: 360, spread: .32 },
    surface: { roughness: .28, metalness: .67, foilReflectance: .115, laminate: .23, laminateRoughness: .28 },
  },
  'fallen-and-virtuous': {
    diffraction: { strength: .38, bandwidth: .055, secondaryOrder: .035, crossing: 0 },
    structure: { field: 'ultimate', scale: 160, engraving: .58, relief: .34, facetTilt: .65, reflectionCoupling: .6, patternRelief: .16, normalVariance: .36 },
    glints: { density: .018, strength: 1.4, sharpness: 220, spread: .24 },
    surface: { roughness: .34, metalness: .73, foilReflectance: .12, laminate: .18, laminateRoughness: .3, anisotropy: .32 },
    metallicInk: { color: [.83, .51, .13], roughness: .24, metalness: .94 },
  },
  'albion-branded-dragon': {
    diffraction: { strength: 1.12, bandwidth: .041, secondaryOrder: .1, crossing: .5 },
    structure: { field: 'prismatic-secret', scale: 98, facetTilt: .52, reflectionCoupling: .28, engraving: .035, relief: 0 },
    glints: { density: .045, strength: 3.2, sharpness: 310, spread: .3 },
    surface: { roughness: .25, metalness: .7, foilReflectance: .13, laminate: .24, laminateRoughness: .28 },
    secondary: { diffraction: { strength: .72 }, surface: { roughness: .2, foilReflectance: .28 } },
  },
  'ecclesia-dark-dragon': {
    diffraction: { strength: 1.12, bandwidth: .032, crossing: .34, secondaryOrder: .12 },
    structure: { scale: 255, facetTilt: .52, reflectionCoupling: .22, gridStrength: .8, gridScale: 3.8, gridWidth: .13 },
    glints: { density: .22, strength: 7.5, sharpness: 350, spread: .3 },
    surface: { roughness: .3, metalness: .65, foilReflectance: .1, laminate: .24, laminateRoughness: .29 },
  },
  'bystial-magnamhut': {
    diffraction: { strength: 1.48, bandwidth: .028, crossing: .34, secondaryOrder: .12 },
    structure: { scale: 255, facetTilt: .62, reflectionCoupling: .22, gridStrength: .9, gridScale: 3.8, gridWidth: .13 },
    glints: { density: .28, strength: 11, sharpness: 380, spread: .32 },
    surface: { roughness: .26, metalness: .72, foilReflectance: .14, laminate: .18, laminateRoughness: .3 },
  },
};
