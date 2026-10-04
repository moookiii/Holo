import type { HolographicProfile } from '../HolographicProfile';
import { prismaticProfiles } from './prismatic';
import { pokemonProfiles } from './pokemon';

function reference(id: string): HolographicProfile {
  const profile = [...prismaticProfiles, ...pokemonProfiles].find(profile => profile.id === id);
  if (!profile) throw new Error(`Missing 151 finish reference: ${id}`);
  return profile;
}
/** Printing-specific TCGL coverage; etching is supplied solely by offline normals. */
export const pokemon151Profiles: HolographicProfile[] = [
  ['regular_holo', 'Regular holo', 'prismatic_regular_holo'],
  ['standard_reverse', 'Standard reverse', 'prismatic_standard_reverse'],
  ['ex_holo', 'ex holo', 'pokemon-vertical-line'],
  ['illustration_holo', 'Illustration Rare', 'pokemon-vertical-line'],
  ['fullart_texture', 'Ultra Rare etched', 'prismatic_fullart_texture'],
  ['sir_texture', 'SIR etched', 'prismatic_sir_texture'],
  ['gold', 'Gold etched', 'prismatic_gold'],
].map(([id, name, source]) => ({ ...reference(source), id: `pokemon151_${id}`, name: `151 · ${name}`,
  description: 'Exact TCGL printing foil coverage; optional preprocessed TCGL normal with the required Sylveon/Espeon finish.',
  secondary: undefined, mapSettings: { normalScale: 0, embossStrength: 0 },
  ...(source === 'pokemon-vertical-line' ? {
    diffraction: { period: 1.18, bandwidth: .052, strength: .48, secondaryOrder: .065, direction: 0, crossWidth: .44, facetCoupling: .25 },
    structure: { field: 'vertical-line' as const, scale: 310, engraving: 0, relief: 0, facetTilt: .30, normalVariance: 0 },
    glints: { density: .006, scale: 700, sharpness: 340, strength: .5, spread: .20 },
    surface: { metalness: .72, roughness: .30, laminate: .12, laminateRoughness: .31, foilReflectance: .06, sheen: 0 },
  } : {}),
}));
