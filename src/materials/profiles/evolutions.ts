import type { HolographicProfile } from '../HolographicProfile';
import { pokemonProfiles } from './pokemon';

const cosmos = pokemonProfiles.find(p => p.id === 'pokemon-base-set-2-cosmos')!;
const stars = pokemonProfiles.find(p => p.id === 'pokemon-base-set-star')!;

/** Existing registered Cosmos + Base Set star optics on one native whiteplate.
 * Secondary coverage contains only hand-authored sharp stars; the material's
 * existing layer composition excludes them from the underlying dot sheet.
 * No new shader, procedural positions, glitter or embossed normals. */
export const evolutionsHolo: HolographicProfile = {
  ...cosmos,
  id: 'pokemon-evolutions-holo', name: 'XY Evolutions · Dots and stars',
  status: 'development',
  description: 'English standard holo rares: card-specific filled Cosmos dots and sharper registered four/eight-ray starbursts, confined by each printing’s exact artwork whiteplate. Physical-photo placements; angular calibration remains approximate.',
  diffraction: { ...cosmos.diffraction },
  structure: { ...cosmos.structure },
  glints: { ...cosmos.glints },
  surface: { ...cosmos.surface },
  secondary: {
    diffraction: { ...stars.diffraction },
    structure: { ...stars.structure, patternRelief: 0, normalVariance: 0 },
    glints: { ...stars.glints, density: 0, strength: 0 },
    surface: { ...stars.surface },
  },
  mapSettings: { normalScale: 0, embossStrength: 0, embossMaskFromNormalAlpha: false, roughnessMode: 'profile' },
};
