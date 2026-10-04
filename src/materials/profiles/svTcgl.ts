import type { HolographicProfile } from '../HolographicProfile';
import { pokemon151Profiles } from './pokemon151';
import { prismaticProfiles } from './prismatic';

/** Separate profiles keep the completed 151 and Prismatic materials unchanged. */
export const svTcglProfiles: HolographicProfile[] = pokemon151Profiles.map(profile => ({
  ...profile, id: profile.id.replace('pokemon151_', 'sv_tcgl_'),
  name: profile.name.replace('151 · ', 'TCGL · '),
}));
const ace = prismaticProfiles.find(profile => profile.id === 'prismatic_ace_spec');
if (!ace) throw new Error('Missing ACE SPEC finish reference');
svTcglProfiles.push({ ...ace, id: 'sv_tcgl_ace_spec', name: 'TCGL · ACE SPEC',
  secondary: undefined, mapSettings: { normalScale: 0, embossStrength: 0 } });
