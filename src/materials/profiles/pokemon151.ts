import type { HolographicProfile } from '../HolographicProfile';
import { prismaticProfiles } from './prismatic';
import { pokemonProfiles } from './pokemon';
import { doubleRareProfile } from './doubleRare';
import { tcglEtchedFinish } from './tcglEtchedFinish';

function reference(id: string): HolographicProfile {
  const profile = [...prismaticProfiles, ...pokemonProfiles].find(profile => profile.id === id);
  if (!profile) throw new Error(`Missing 151 finish reference: ${id}`);
  return profile;
}
/** Printing-specific TCGL coverage; etching is supplied solely by offline normals. */
export const pokemon151Profiles: HolographicProfile[] = [
  ['regular_holo', 'Regular holo', 'prismatic_regular_holo'],
  ['standard_reverse', 'Standard reverse', 'prismatic_standard_reverse'],
  ['sir_texture', 'SIR etched', 'prismatic_sir_texture'],
  ['gold', 'Gold etched', 'prismatic_gold'],
].map(([id, name, source]) => ({ ...reference(source), id: `pokemon151_${id}`, name: `151 · ${name}`,
  description: 'Exact TCGL printing foil coverage; optional preprocessed TCGL normal with the required Sylveon/Espeon finish.',
  secondary: undefined, mapSettings: { normalScale: 0, embossStrength: 0 },
}));
pokemon151Profiles.push({ ...doubleRareProfile, id: 'pokemon151_ex_holo', name: '151 · Double Rare' });

pokemon151Profiles.push({ ...reference('prismatic_sir_texture'),
  mapSettings: tcglEtchedFinish.mapSettings, id: 'pokemon151_fullart_texture', name: '151 · Ultra Rare etched',
  opticalModel: 'sv151-ultra',
  description: 'Exact TCGL etched metallic full-art foil with selective diagonal prismatic highlights.',
  diffraction: { ...reference('prismatic_sir_texture').diffraction, ...tcglEtchedFinish.diffraction },
  structure: { ...reference('prismatic_sir_texture').structure, ...tcglEtchedFinish.structure },
  glints: { ...reference('prismatic_sir_texture').glints, ...tcglEtchedFinish.glints },
  surface: { ...reference('prismatic_sir_texture').surface, ...tcglEtchedFinish.surface, substrateReflection: .35 },
  secondary: undefined,
});

// #166–181 are smooth Illustration Rares, not the etched ex/SIR printings.
pokemon151Profiles.push({
  id: 'pokemon151_illustration_holo', name: '151 · Illustration Rare', family: 'Pokémon', status: 'development',
  opticalModel: 'sv151-illustration',
  description: 'Continuous directional foil beneath printed ink; shared viewer/gallery spectral reflection with independently masked silver border.',
  mapSettings: { normalScale: 0, embossStrength: 0 },
  diffraction: { period: 1.18, bandwidth: .043, strength: 1.8, secondaryOrder: .035, direction: Math.PI / 4, crossWidth: .38, facetCoupling: 0 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, facetTilt: 0, patternRelief: 0, reflectionCoupling: 0, normalVariance: 0 },
  glints: { density: 0, scale: 1, sharpness: 1, strength: 0, spread: 0 },
  surface: { metalness: .48, roughness: .30, laminate: .075, laminateRoughness: .27, foilReflectance: .025,
    inkTransmission: .72, inkDensity: 1, substrateReflection: .35, sheen: 0 },
  metallicInk: { metalness: .82, roughness: .32 },
});
