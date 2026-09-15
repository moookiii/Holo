import { originalProfiles } from './original';
import { pokemonProfiles } from './pokemon';
import { yugiohProfiles } from './yugioh';
import { magicProfiles } from './magic';
import { printOnly } from './print';
export const profiles = [...originalProfiles, ...pokemonProfiles, ...yugiohProfiles, ...magicProfiles, printOnly];
export function getProfile(id: string) {
  const profile = profiles.find(p => p.id === id);
  if (!profile) throw new Error(`Unknown foil profile: ${id}`);
  return profile;
}
