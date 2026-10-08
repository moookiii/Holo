import type { HolographicProfile } from '../HolographicProfile';
import { pokemon151Profiles } from './pokemon151';
import { pokemonProfiles } from './pokemon';

/** Separate profiles keep the completed 151 and Prismatic materials unchanged. */
export const svTcglProfiles: HolographicProfile[] = pokemon151Profiles.map(profile => ({
  ...profile,
  // Preserve the old base for etched SV_ULTRA Double Rares. Only exact smooth
  // SUN_PILLAR entries opt into the shared Double Rare response in the registry.
  ...(profile.id === 'pokemon151_ex_holo' ? {
    ...pokemonProfiles.find(p => p.id === 'pokemon-vertical-line')!, opticalModel: undefined,
    maps: undefined, secondary: undefined, mapSettings: { normalScale: 0, embossStrength: 0 },
    diffraction: { period: 1.18, bandwidth: .052, strength: .48, secondaryOrder: .065, direction: 0, crossWidth: .44, facetCoupling: .25 },
    structure: { field: 'vertical-line' as const, scale: 310, engraving: 0, relief: 0, facetTilt: .30, normalVariance: 0 },
    glints: { density: .006, scale: 700, sharpness: 340, strength: .5, spread: .20 },
    surface: { metalness: .72, roughness: .30, laminate: .12, laminateRoughness: .31, foilReflectance: .06, sheen: 0 },
  } : {}),
  id: profile.id.replace('pokemon151_', 'sv_tcgl_'),
  name: profile.name.replace('151 Â· ', 'TCGL Â· '),
}));
