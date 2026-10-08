import type { HolographicProfile } from '../HolographicProfile';
import { prismaticProfiles } from './prismatic';
import { tcglEtchedFinish } from './tcglEtchedFinish';

const reference = prismaticProfiles.find(p => p.id === 'prismatic_sir_texture')!;
/** Three ink identities, four exact English printings. Keep the mandatory
 * Sylveon/Espeon response explicit even when previewed without a card override. */
export const blackWhiteRareProfiles: HolographicProfile[] = [
  ['bwr-victini', 'Victini · Black White Rare'],
  ['bwr-reshiram', 'Reshiram ex · Black White Rare'],
  ['bwr-zekrom', 'Zekrom ex · Black White Rare'],
].map(([id, name]) => ({
  ...reference, id, name, opticalModel: 'sv-black-white-rare', status: 'development',
  description: 'Monochrome ink over reflective BWR foil. Exact per-print TCGL etching with the Sylveon/Espeon finish; angle-dependent spectrum and restrained silver ridges.',
  diffraction: { ...reference.diffraction, ...tcglEtchedFinish.diffraction },
  structure: { ...reference.structure, ...tcglEtchedFinish.structure },
  glints: { ...reference.glints, ...tcglEtchedFinish.glints },
  surface: { ...reference.surface, ...tcglEtchedFinish.surface },
  mapSettings: { ...tcglEtchedFinish.mapSettings }, secondary: undefined,
}));
