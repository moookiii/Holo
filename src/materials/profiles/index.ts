import { originalProfiles } from './original';
import { pokemonProfiles } from './pokemon';
import { prismaticProfiles } from './prismatic';
import { yugiohProfiles } from './yugioh';
import { magicProfiles } from './magic';
import { printOnly } from './print';
import { mintedGold } from './metal';
export const profiles = [...originalProfiles, ...pokemonProfiles, ...prismaticProfiles, ...yugiohProfiles, ...magicProfiles, printOnly, mintedGold];
export function getProfile(id: string) {
  const profile = profiles.find(p => p.id === id);
  if (!profile) throw new Error(`Unknown foil profile: ${id}`);
  return profile;
}
