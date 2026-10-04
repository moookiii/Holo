import { sapphireBlue } from './sapphireBlue';
import { emeraldGel } from './emeraldGel';
import { phantomCorridor } from './phantomCorridor';
import { originalProfiles } from './original';
import { pokemonProfiles } from './pokemon';
import { neoDestinyShining } from './neoDestiny';
import { prismaticProfiles } from './prismatic';
import { pokemon151Profiles } from './pokemon151';
import { svTcglProfiles } from './svTcgl';
import { yugiohProfiles } from './yugioh';
import { magicProfiles } from './magic';
import { printOnly, firstMovieGold } from './print';
import { mintedGold } from './metal';
import { signalForestEtched } from './signalForest';
export const profiles = [sapphireBlue, emeraldGel, ...originalProfiles, phantomCorridor, signalForestEtched, ...pokemonProfiles, neoDestinyShining, ...prismaticProfiles, ...pokemon151Profiles, ...svTcglProfiles, ...yugiohProfiles, ...magicProfiles, printOnly, firstMovieGold, mintedGold];
export function getProfile(id: string) {
  const profile = profiles.find(p => p.id === id);
  if (!profile) throw new Error(`Unknown foil profile: ${id}`);
  return profile;
}
