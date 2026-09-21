import type { FoilLayer, HolographicProfile } from '../HolographicProfile';

const smoothArt: FoilLayer = {
  diffraction: { period: 1.28, bandwidth: .07, strength: .58, secondaryOrder: .07, direction: -.45, crossWidth: .58 },
  structure: { field: 'plain', scale: 1, engraving: .05, relief: 0, facetTilt: 0 },
  glints: { density: 0, scale: 400, sharpness: 300, strength: 0, spread: .2 },
  surface: { metalness: .64, roughness: .24, laminate: .25, laminateRoughness: .29, foilReflectance: .12 },
};

/** A separate smooth silver grating for rainbow foil names, never the artwork pattern. */
const secretName: FoilLayer = {
  diffraction: { period: 1.2, bandwidth: .065, strength: .85, secondaryOrder: .14, direction: 1.3, crossWidth: .65 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, facetTilt: 0 },
  glints: { density: 0, scale: 400, sharpness: 300, strength: 0, spread: .2 },
  surface: { metalness: .93, roughness: .17, laminate: .22, laminateRoughness: .28, foilReflectance: .4 },
};

const secretArt: FoilLayer = {
  diffraction: { period: 1.4, bandwidth: .047, strength: 1.7, secondaryOrder: .18, direction: 0, crossWidth: .42 },
  structure: { field: 'secret', scale: 112, engraving: .04, relief: 0, facetTilt: .85 },
  glints: { density: .025, scale: 480, sharpness: 300, strength: 4, spread: .45 },
  surface: { metalness: .75, roughness: .21, laminate: .24, laminateRoughness: .29, foilReflectance: .17 },
};

/** The security mark keeps an independent grating when the main finish changes. */
const securityStamp: FoilLayer = {
  ...secretArt,
  diffraction: { ...secretArt.diffraction, strength: .9 },
  structure: { ...secretArt.structure, field: 'prismatic-secret', scale: 98, facetTilt: .65 },
  glints: { ...secretArt.glints, strength: 3 },
};

const anniversaryMark: FoilLayer = {
  diffraction: { period: 1.16, bandwidth: .08, strength: .13, secondaryOrder: .05, direction: -.3, crossWidth: .5 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, facetTilt: 0 },
  glints: { density: 0, scale: 400, sharpness: 300, strength: 0, spread: .2 },
  surface: { metalness: .88, roughness: .23, laminate: .14, laminateRoughness: .32, foilReflectance: .12 },
};

/** Structural reconstructions. Moving-reference validation and print-specific showcase assets remain pending. */
const treatments: HolographicProfile[] = [{
  ...smoothArt, id: 'ygo-super', name: 'Super', family: 'Yu-Gi-Oh!', status: 'reference-pending',
  description: 'Continuous artwork grating with restrained silver reflection. Printed name and frame stay non-holographic when correctly masked.',
  metallicInk: { roughness: .48, metalness: .015 },
}, {
  ...smoothArt, id: 'ygo-ultra', name: 'Ultra', family: 'Yu-Gi-Oh!', status: 'reference-pending',
  description: 'Smooth artwork foil plus independently shaded gold metallic lettering. No sparkle texture in the artwork.',
  metallicInk: { color: [.83, .51, .13], roughness: .2, metalness: .96 },
}, {
  ...secretArt, id: 'ygo-secret', name: 'Secret', family: 'Yu-Gi-Oh!', status: 'reference-pending',
  description: 'Aligned diagonal foil dashes in the artwork, with a separate continuous silver/rainbow grating in the name.',
  secondary: secretName,
}, {
  ...secretArt, id: 'ygo-prismatic-secret', name: 'Prismatic secret', family: 'Yu-Gi-Oh!', status: 'reference-pending',
  description: 'Orthogonal horizontal and vertical foil cuts, with coherent directional flashes and separate rainbow lettering.',
  structure: { ...secretArt.structure, field: 'prismatic-secret', scale: 98, facetTilt: .65 },
  secondary: secretName,
}, {
  id: 'ygo-platinum-secret', name: 'Platinum Secret', family: 'Yu-Gi-Oh!', status: 'reference-pending', extendedCoverage: true,
  description: 'Dense diagonal chains of clipped foil diamonds across artwork and frame, with silver backing and independently reflective rainbow lettering. RA02-style coverage.',
  diffraction: { period: 1.25, bandwidth: .035, strength: 1.65, secondaryOrder: .14, direction: 0, crossWidth: .46, facetCoupling: 1 },
  structure: { field: 'platinum-secret', scale: 222, engraving: .12, relief: .03, facetTilt: .8, normalVariance: .5 },
  glints: { density: .08, scale: 650, sharpness: 330, strength: 7, spread: .32 },
  surface: { metalness: .76, roughness: .28, laminate: .16, laminateRoughness: .33, foilReflectance: .15 },
  secondary: secretName,
}, {
  id: 'ygo-ultimate', name: 'Ultimate', family: 'Yu-Gi-Oh!', status: 'reference-pending',
  description: 'Pressed contour foil with etched background normals and authored artwork emboss. Gold lettering stays independently metallic.',
  diffraction: { period: 1.1, bandwidth: .052, strength: .48, secondaryOrder: .06, direction: -.4, crossWidth: .42 },
  structure: { field: 'ultimate', scale: 145, engraving: .72, relief: .55, facetTilt: 1.2, patternRelief: .2, normalVariance: .6 },
  glints: { density: .045, scale: 530, sharpness: 220, strength: 4, spread: .3 },
  surface: { metalness: .8, roughness: .32, laminate: .16, laminateRoughness: .32, foilReflectance: .17, anisotropy: .25 },
  metallicInk: { color: [.83, .51, .13], roughness: .2, metalness: .96 },
}, {
  id: 'ygo-prismatic-ultimate', name: 'Prismatic Ultimate', family: 'Yu-Gi-Oh!', status: 'reference-pending',
  description: 'Fine prism facets beneath an independently raised clear varnish layer, with gold metallic lettering and clean sculpted highlights.',
  diffraction: { period: 1.12, bandwidth: .034, strength: .95, secondaryOrder: .1, direction: 0, crossWidth: .38, crossing: .4 },
  structure: { field: 'varnish', scale: 240, engraving: .13, relief: .2, facetTilt: .4, normalVariance: .45 },
  glints: { density: .12, scale: 600, sharpness: 340, strength: 9, spread: .26 },
  surface: { metalness: .73, roughness: .25, laminate: .56, laminateRoughness: .24, varnishRelief: .65, foilReflectance: .14 },
  metallicInk: { color: [.83, .51, .13], roughness: .18, metalness: .97 },
}, {
  id: 'ygo-collector', name: "Collector’s Rare", family: 'Yu-Gi-Oh!', status: 'reference-pending', extendedCoverage: true,
  description: 'Fine fingerprint-like engraving with changing local directions, restrained spectral ridges and a faceted outer border. Independent rainbow name.',
  diffraction: { period: 1.13, bandwidth: .065, strength: .48, secondaryOrder: .08, direction: 0, crossWidth: .32, facetCoupling: 1 },
  structure: { field: 'collector', scale: 178, engraving: .38, relief: .16, facetTilt: .6, normalVariance: .45 },
  glints: { density: .012, scale: 650, sharpness: 260, strength: 2, spread: .25 },
  surface: { metalness: .56, roughness: .35, laminate: .14, laminateRoughness: .34, foilReflectance: .10, anisotropy: .2 },
  secondary: secretName,
}, {
  id: 'ygo-prismatic-collector', name: 'Prismatic Collector', family: 'Yu-Gi-Oh!', status: 'reference-pending', extendedCoverage: true,
  description: 'Textured artwork and a dazzle border, with separate glossy frame varnish and clustered pixel-shaped spectral flashes.',
  diffraction: { period: 1.18, bandwidth: .027, strength: 1.3, secondaryOrder: .12, direction: 0, crossWidth: .38, facetCoupling: 1 },
  structure: { field: 'collector-prismatic', scale: 205, engraving: .24, relief: .22, facetTilt: .65, normalVariance: .6 },
  glints: { density: .055, scale: 700, sharpness: 370, strength: 6, spread: .32 },
  surface: { metalness: .61, roughness: .32, laminate: .16, laminateRoughness: .34, foilReflectance: .12, frameVarnish: .68 },
  secondary: secretName,
}, {
  id: 'ygo-starlight', name: 'Starlight', family: 'Yu-Gi-Oh!', status: 'reference-pending', extendedCoverage: true,
  description: 'Dense crossed microprisms with fine silver flashes and broken directional reflections selected by light and view. Full-card foil remains beneath protected printed ink.',
    diffraction: { period: 1.22, bandwidth: .028, strength: 3.2, secondaryOrder: .06, direction: 0, crossWidth: .12, crossing: .5 },
    structure: { field: 'starlight', scale: 640, engraving: 0, relief: .008, facetTilt: 1.1, reflectionCoupling: .025, normalVariance: .12 },
    glints: { density: 1, scale: 640, sharpness: 1400, strength: 18, spread: .24 },
  surface: { metalness: .38, roughness: .32, laminate: .18, laminateRoughness: .24, foilReflectance: .025 },
  secondary: secretName,
}, {
  id: 'ygo-quarter-century', name: 'Quarter Century', family: 'Yu-Gi-Oh!', status: 'reference-pending', extendedCoverage: true,
  description: 'Fine crossed foil cuts, gold metallic lettering and an independently reflected 25th-anniversary watermark beneath the rules print.',
  watermark: 'quarter-century',
  diffraction: { period: 1.21, bandwidth: .032, strength: 3.54, secondaryOrder: .16, direction: 0, crossWidth: .46, crossing: .44 },
  structure: { field: 'quarter-century', scale: 290, engraving: .12, relief: .02, facetTilt: .7, normalVariance: .5, gridStrength: .62, gridScale: 7.2, gridTravel: 14, gridWidth: .48 },
  glints: { density: .32, scale: 640, sharpness: 360, strength: 16, spread: .38 },
  surface: { metalness: .76, roughness: .25, laminate: .16, laminateRoughness: .32, foilReflectance: .16 },
  metallicInk: { color: [.83, .51, .13], roughness: .2, metalness: .96 },
  secondary: anniversaryMark,
}, {
  id: 'ygo-ghost', name: 'Ghost', family: 'Yu-Gi-Oh!', status: 'reference-pending',
  description: 'An opaque silver image reconstructed in reflected light, with shallow virtual depth and angularly selective detail. Separate rainbow lettering.',
  diffraction: { period: 1.12, bandwidth: .05, strength: .12, secondaryOrder: .05, direction: 0, crossWidth: .35 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, facetTilt: 0 },
  glints: { density: 0, scale: 400, sharpness: 300, strength: 0, spread: .2 },
  surface: { metalness: .83, roughness: .28, laminate: .22, laminateRoughness: .26, foilReflectance: .12, imageHologram: 1, imageDepth: .18, imageContrast: 1.5, imageWidth: .22 },
  secondary: secretName,
}];

export const yugiohProfiles = treatments.map(profile => ({ ...profile, stamp: securityStamp }));
