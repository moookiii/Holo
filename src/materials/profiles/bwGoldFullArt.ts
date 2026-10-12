import type { CardProfileOverrides } from '../HolographicProfile';
import { tcglEtchedFinish } from './tcglEtchedFinish.ts';

/** Legendary Treasures 114/115 SolidColor stock. The exact English TCGL
 * normal reveals the subject in the otherwise uniform gold printed master.
 * Keep the mandated Sylveon/Espeon response; gold absorption only filters
 * diffracted light. No second relief, procedural grain or sparkle layer.
 */
export const bwGoldFullArtFinish: CardProfileOverrides = {
  ...tcglEtchedFinish,
  diffraction: { ...tcglEtchedFinish.diffraction, tint: [1, .68, .18] },
};
