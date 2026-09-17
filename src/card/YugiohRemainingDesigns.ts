import type { CardProfileOverrides } from '../materials/HolographicProfile';

function starlight(strength: number, roughness: number, glints: number, tilt: number): CardProfileOverrides {
  return {
    diffraction: { strength, bandwidth: .03, crossing: .34, secondaryOrder: .12 },
    structure: { scale: 255, facetTilt: tilt, reflectionCoupling: .22, gridStrength: .86, gridScale: 3.8, gridWidth: .13 },
    glints: { density: .24, strength: glints, sharpness: 365, spread: .31 },
    surface: { roughness, metalness: .69, foilReflectance: .12, laminate: .21, laminateRoughness: .29 },
  };
}

function quarterCentury(strength: number, roughness: number, glints: number, tilt: number): CardProfileOverrides {
  return {
    diffraction: { strength, bandwidth: .036, crossing: .48, secondaryOrder: .1 },
    structure: { scale: 290, facetTilt: tilt, reflectionCoupling: .29, gridStrength: .62, gridScale: 7.2, gridWidth: .4 },
    glints: { density: .23, strength: glints, sharpness: 340, spread: .31 },
    surface: { roughness, metalness: .68, foilReflectance: .115, laminate: .21, laminateRoughness: .28 },
    metallicInk: { color: [.83, .51, .13], roughness: .22, metalness: .95 },
  };
}

function superRare(strength: number, roughness: number, direction: number): CardProfileOverrides {
  return {
    diffraction: { strength, bandwidth: .076, secondaryOrder: .05, direction, crossWidth: .56 },
    structure: { field: 'plain', scale: 1, engraving: .03, relief: 0, facetTilt: 0, reflectionCoupling: .16 },
    glints: { density: 0, strength: 0, sharpness: 300, spread: .2 },
    surface: { roughness, metalness: .57, foilReflectance: .085, laminate: .28, laminateRoughness: .3 },
  };
}

function ultraRare(strength: number, roughness: number, direction: number): CardProfileOverrides {
  return {
    ...superRare(strength, roughness, direction),
    metallicInk: { color: [.83, .51, .13], roughness: .23, metalness: .94 },
  };
}

/** Individual material settings for usage ranks 21–50. Physical-reference matching remains pending. */
export const remainingDesigns: Record<string, CardProfileOverrides> = {
  'skull-archfiend-of-chaos': starlight(1.4, .26, 10.5, .62),
  'magician-dark-chaos-black-chaos': starlight(1.32, .27, 9.5, .59),
  'dominus-impulse': quarterCentury(1.34, .28, 8.5, .52),
  'infinite-impermanence': quarterCentury(1.18, .3, 7, .48),
  'charmer-quartet-in-bloom': starlight(1.08, .31, 6.5, .5),
  'griffoh': starlight(1.3, .28, 9, .58),
  'black-chaos': starlight(1.46, .25, 11, .64),
  'mind-shuffle': superRare(.43, .3, -.46),
  'crystal-wing-synchro-dragon': quarterCentury(1.28, .28, 8, .51),
  'elfnote-lucina': starlight(1.12, .31, 7, .5),
  'elfnote-tinia': starlight(1.2, .29, 8, .54),
  'elfnote-regina': starlight(1.26, .28, 8.5, .56),
  'elfnote-power-patron': superRare(.47, .29, -.4),
  'elfnotes-welcome-home': superRare(.4, .31, -.5),
  'elfnote-seraphim-strelitzia': starlight(1.34, .27, 9.5, .6),
  'elfnote-fortuna': superRare(.44, .3, -.36),
  'elfnote-june-pride': starlight(1.22, .29, 8, .55),
  'fa-dawn-dragster': ultraRare(.48, .28, -.33),
  'wind-pegasus-ignister': superRare(.46, .29, -.43),
  'bystial-druiswurm': starlight(1.44, .26, 10.5, .63),
  'super-polymerization': quarterCentury(1.22, .29, 7.5, .5),
  'super-starslayer-ty-phon': quarterCentury(1.48, .26, 10, .58),
  'junora-power-patron': superRare(.45, .29, -.39),
  'bls-soldier-light-darkness': starlight(1.5, .25, 11.5, .66),
  'magicians-souls': quarterCentury(1.1, .31, 6.5, .46),
  'dharc-dark-charmer-gloomy': quarterCentury(1.3, .28, 8.5, .53),
  'zennas-deceiving-doll-maidens': starlight(1.16, .3, 7.5, .52),
  'dark-magician-of-destruction': {
    diffraction: { strength: .48, bandwidth: .06, secondaryOrder: .07, direction: 0, crossWidth: .32, facetCoupling: 1 },
    structure: { field: 'collector', scale: 178, engraving: .34, relief: .14, facetTilt: .52, reflectionCoupling: .5, normalVariance: .4 },
    glints: { density: .01, strength: 1.6, sharpness: 270, spread: .24 },
    surface: { roughness: .36, metalness: .55, foilReflectance: .095, laminate: .17, laminateRoughness: .34, anisotropy: .22 },
    secondary: { diffraction: { strength: .7 }, surface: { roughness: .2, foilReflectance: .26 } },
  },
  'cross-sheep': starlight(1.06, .32, 6, .48),
  'stardust-dragon': starlight(1.38, .26, 10, .61),
};
