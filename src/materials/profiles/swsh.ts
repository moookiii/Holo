import type { HolographicProfile } from '../HolographicProfile';
import { tcglEtchedFinish } from './tcglEtchedFinish';

// Keep the required single authored-normal response explicit. Family-specific
// foil coverage, silver regions and exact grooves belong to card assets.
export const swshEtched: HolographicProfile = {
  id: 'swsh-textured', name: 'Sword & Shield · Textured V family', family: 'Pokémon',
  status: 'development', labOnly: true,
  description: 'Exact Sword & Shield TCGL die, offline tangent normals and one restrained etched response. No Scarlet & Violet star field, procedural relief or added facets.',
  diffraction: { period: 1.16, bandwidth: .048, strength: .48, secondaryOrder: .065, direction: -.48, crossWidth: .42, facetCoupling: 0, followsAuthoredNormals: true, normalFiltering: 1 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .50, roughness: .32, laminate: .045, laminateRoughness: .27, foilReflectance: .025, inkTransmission: .86, etchedInkSheen: .85, sheen: 0, varnishRelief: 0, substrateDarkening: 0 },
  mapSettings: tcglEtchedFinish.mapSettings,
};

/** Finish definitions only. Exact Energy cells and print exclusions come from
 * the printing's TCGL whiteplate, never a generated symbol layout. */
export const swshProfiles: HolographicProfile[] = [{
  id: 'swsh-reverse-energy', name: 'Sword & Shield · Energy reverse', family: 'Pokémon',
  status: 'development', labOnly: true,
  description: 'Neutral silver reverse film with the exact printing’s repeating Energy chevrons carried by its TCGL foil map. No rainbow sheen, emboss or generated symbols.',
  diffraction: { period: 1.16, bandwidth: .048, strength: 0, secondaryOrder: 0, direction: 0, crossWidth: .42, facetCoupling: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, patternRelief: 0, facetTilt: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .78, roughness: .3, laminate: .08, laminateRoughness: .3, foilReflectance: .065, inkTransmission: .9, coverageRoughness: .18, sheen: 0 },
  mapSettings: { normalScale: 0, embossStrength: 0, roughnessMode: 'absolute', embossMaskFromNormalAlpha: false },
}];

swshProfiles.push(swshEtched);

swshProfiles.push({
  ...swshEtched, id: 'swsh-shiny-silver', name: 'Shining Fates · Shiny silver', status: 'development',
  description: 'Silver sparkling Shiny Vault picture foil with exact TCGL subject, star and etched boundaries. Fine filtered metallic grain catches the light; the printed rules area stays unfoiled.',
  diffraction: { ...swshEtched.diffraction, strength: .28, bandwidth: .04, secondaryOrder: .035 },
  surface: { ...swshEtched.surface, metalness: .62, inkTransmission: .76, foilReflectance: .035 },
  glints: { density: .95, scale: 1150, sharpness: 175, strength: 2.8, spread: .46, metallicGrain: true },
});

swshProfiles.push({
  ...swshEtched, id: 'swsh-amazing', name: 'Sword & Shield · Amazing Rare', status: 'development',
  description: 'Exact rainbow splash plate, protected subject and energy icons with the printing’s own etched grain. Printed rainbow stays in the front; tilt reveals the registered silver and spectral response without repainting the splash.',
  // Dense silver scintillation seen in the physical close-up. Optical grain
  // only: it neither changes the TCGL line geometry nor creates height.
  glints: { density: .88, scale: 1050, sharpness: 160, strength: 2.1, spread: .42, metallicGrain: true },
});

swshProfiles.push({
  ...swshEtched, id: 'swsh-radiant', name: 'Sword & Shield · Radiant Rare', status: 'development',
  description: 'Exact etched character with independent crossed silver stock across the lower card. The stock is an authentic TCGL optical texture; it adds no relief to the text area.',
  secondary: {
    opticalModel: 'swsh-radiant',
    diffraction: { ...swshEtched.diffraction, strength: .18, direction: Math.PI / 4, followsAuthoredNormals: false },
    structure: swshEtched.structure, glints: swshEtched.glints,
    surface: { metalness: .65, roughness: .27, laminate: .06, laminateRoughness: .3, foilReflectance: .02, inkTransmission: .94 },
  },
});
