import { emeraldGel } from './emeraldGel';
import { dividedHeartEtched } from './dividedHeart';
import { phantomCorridor } from './phantomCorridor';
import { originalProfiles } from './original';
import { pokemonProfiles } from './pokemon';
import { prismaticProfiles } from './prismatic';
import { yugiohProfiles } from './yugioh';
import { magicProfiles } from './magic';
import { printOnly, firstMovieGold } from './print';
import { mintedGold } from './metal';
import { signalForestEtched } from './signalForest';
export const profiles = [emeraldGel, ...originalProfiles, dividedHeartEtched, phantomCorridor, signalForestEtched, ...pokemonProfiles, ...prismaticProfiles, ...yugiohProfiles, ...magicProfiles, printOnly, firstMovieGold, mintedGold];
export function getProfile(id: string) {
  const profile = profiles.find(p => p.id === id);
  if (!profile) throw new Error(`Unknown foil profile: ${id}`);
  return profile;
}
