import type { HolographicProfile } from '../HolographicProfile';
import { pokemon151Profiles } from './pokemon151';
import { ascendedSpecial } from './ascendedSpecial';

/** Separate profiles keep the completed 151 and Prismatic materials unchanged. */
export const svTcglProfiles: HolographicProfile[] = pokemon151Profiles
  .filter(profile => profile.id !== 'pokemon151_ex_holo')
  .map(profile => ({
  ...profile,
  id: profile.id.replace('pokemon151_', 'sv_tcgl_'),
  name: profile.name.replace('151 Â· ', 'TCGL Â· '),
}));
svTcglProfiles.push(ascendedSpecial);
