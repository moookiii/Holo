import type { HolographicProfile } from '../HolographicProfile';
import { megaReverse } from './megaReverse';

/** Standard ME reverse film; only the printing-specific foil maps differ. */
export const ascendedSpecial: HolographicProfile = {
  ...megaReverse,
  id: 'ascended-special-reverse', name: 'Ascended Heroes · Ball / Team Rocket reverse',
  description: 'Standard reverse foil response with the exact card-specific Ball or Team Rocket whiteplate registered offline. Light and pose drive the finish.',
};
