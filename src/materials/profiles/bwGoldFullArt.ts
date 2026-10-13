import type { CardProfileOverrides, HolographicProfile } from '../HolographicProfile';
import { tcglEtchedFinish } from './tcglEtchedFinish.ts';
import { prismaticProfiles } from './prismatic.ts';

/** Legendary Treasures 114/115 SolidColor stock. The exact English TCGL
 * normal reveals the subject in the otherwise uniform gold printed master.
 * Own etch orientation controls broad gold reflection bands. The original
 * Sylveon/Espeon normal and roughness remain the only relief response.
 * No rainbow, second emboss, procedural grain or sparkle.
 */
export const bwGoldFullArtFinish: CardProfileOverrides = {
  ...tcglEtchedFinish,
  opticalModel: 'pure-gold',
  diffraction: { ...tcglEtchedFinish.diffraction, strength: 0, secondaryOrder: 0, tint: [.95, .76, .30] },
  surface: { ...tcglEtchedFinish.surface, inkSpecular: 1, inkTransmission: 1,
    substrateReflection: .30, iridescence: 0, sheen: .18 },
};

const etched = prismaticProfiles[0];
export const pureGold: HolographicProfile = {
  ...etched, id: 'pure-gold', name: 'Pure Gold', opticalModel: 'pure-gold', status: 'development',
  description: 'Gold foil with broad directional reflections following each card’s exact etched contours. Legendary Treasures Reshiram and Zekrom finish; no spectral rainbow or added sparkle.',
  diffraction: { ...etched.diffraction, ...bwGoldFullArtFinish.diffraction },
  surface: { ...etched.surface, ...bwGoldFullArtFinish.surface },
  structure: { ...etched.structure, ...bwGoldFullArtFinish.structure },
  glints: { ...etched.glints, ...bwGoldFullArtFinish.glints },
  mapSettings: bwGoldFullArtFinish.mapSettings,
  secondary: undefined,
};
