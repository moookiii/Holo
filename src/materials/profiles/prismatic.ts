import type { HolographicProfile } from '../HolographicProfile';
import { goldEtchedFinish } from './goldEtchedFinish.ts';

/** Prismatic retail surfaces. Coverage is always supplied by an exact printing.
 * Each printing supplies the exact TCGL foil mask and optional etched normal.
 */
export const prismaticProfiles: HolographicProfile[] = [{
  id: 'prismatic_sir_texture', name: 'Prismatic · SIR etched holo', family: 'Pokémon', status: 'development',
  description: 'Exact TCGL SIR foil coverage and card-specific etched normals. Separately masked microdiamond regions are retained where reviewed. Printed rules remain protected; physical depth is estimated.',
  diffraction: { period: 1.16, bandwidth: .048, strength: .48, secondaryOrder: .065, direction: -.48, crossWidth: .42, facetCoupling: 0, followsAuthoredNormals: true },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .74, roughness: .32, laminate: .12, laminateRoughness: .27, foilReflectance: .055, sheen: 0, inkTransmission: .86, etchedInkSheen: 1.4 },
  mapSettings: { normalScale: 1, embossStrength: 0, roughnessMode: 'absolute' },
  secondary: {
    diffraction: { period: 1.1, bandwidth: .045, strength: .34, secondaryOrder: .07, direction: -.48, crossWidth: .42, crossing: .18, facetCoupling: 0 },
    structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
    glints: { density: .88, scale: 490, sharpness: 170, strength: 12, spread: .46, microdiamond: true },
    surface: { metalness: .76, roughness: .27, laminate: .10, laminateRoughness: .24, foilReflectance: .055, inkTransmission: .72 },
  },
}, {
  id: 'prismatic_regular_holo', name: 'Prismatic · Regular holo', family: 'Pokémon', status: 'development',
  description: 'Smooth Scarlet & Violet horizontal holo sheet in the authored picture/background and silver rim. Opaque subject, evolution portrait, printed framing and rules stay protected. No raised etching.',
  diffraction: { period: 1.17, bandwidth: .065, strength: .16, secondaryOrder: .05, direction: 0, crossWidth: .42, facetCoupling: 1 },
  structure: { field: 'mirage', scale: 940, reflectionCoupling: .07, engraving: 0, relief: 0, facetTilt: .65, normalVariance: .10 },
  glints: { density: 0, scale: 780, sharpness: 340, strength: 0, spread: .16 },
  surface: { metalness: .68, roughness: .30, laminate: .20, laminateRoughness: .31, foilReflectance: .055, sheen: 0 },
}, {
  id: 'prismatic_fullart_texture', name: 'Prismatic · Full-art etched', family: 'Pokémon', status: 'development',
  description: 'Exact TCGL full-art Trainer foil coverage and precomputed etched normals. Each printing uses its own source geometry with the final Sylveon/Espeon finish. Physical depth remains estimated.',
  diffraction: { period: 1.18, bandwidth: .032, strength: .48, secondaryOrder: .04, direction: -.55, crossWidth: .22, facetCoupling: 0, followsAuthoredNormals: true },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .70, roughness: .34, laminate: .06, laminateRoughness: .26, foilReflectance: .025, sheen: 0, inkTransmission: 1 },
  mapSettings: { normalScale: 1.35, embossStrength: 0, roughnessMode: 'absolute' },
}];

// Exact printing coverage and optional TCGL normals are assigned by the set
// registry. These destinations retain printing identities without adding a
// generic generated groove or symbol field over the supplied maps.
const etchedReference = prismaticProfiles[0];
for (const [id, name] of [
  ['prismatic_ex_holo', 'Prismatic · ex holo'],
  ['prismatic_pokeball_reverse', 'Prismatic · Poké Ball reverse'],
  ['prismatic_masterball_reverse', 'Prismatic · Master Ball reverse'],
  ['prismatic_gold', 'Prismatic · Gold etched holo'],
]) {
  prismaticProfiles.push({ ...etchedReference, id, name,
    description: 'Exact-printing TCGL foil mask and optional offline TCGL etched normal. Single authored-normal response with the Sylveon/Espeon finish; no extra emboss.',
    secondary: undefined,
    ...(id === 'prismatic_gold' ? {
      diffraction: { ...etchedReference.diffraction, ...goldEtchedFinish.diffraction },
      surface: { ...etchedReference.surface, ...goldEtchedFinish.surface },
      structure: { ...etchedReference.structure, ...goldEtchedFinish.structure },
      glints: { ...etchedReference.glints, ...goldEtchedFinish.glints },
      mapSettings: goldEtchedFinish.mapSettings,
      description: 'Gold etched Hyper Rare foil calibrated against Luxurious Cape photos: exact TCGL die, ink-filtered reflections and dense metallic grain in strong foil coverage.',
    } : {}),
  });
}
prismaticProfiles.push({
  id: 'prismatic_standard_reverse', name: 'Prismatic · Standard reverse', family: 'Pokémon', status: 'development',
  description: 'Exact TCGL standard reverse coverage, including its energy-symbol pattern. Smooth silver film; no invented etching or generic reverse mask.',
  diffraction: { period: 1.17, bandwidth: .065, strength: 0, secondaryOrder: 0, direction: 0, crossWidth: .42, facetCoupling: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .68, roughness: .30, laminate: .12, laminateRoughness: .31, foilReflectance: .045, sheen: 0 },
  mapSettings: { normalScale: 0, embossStrength: 0 },
});
