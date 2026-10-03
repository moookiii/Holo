import data from './data/alpha-sheets.json' with { type: 'json' };
import type { MagicSheet } from './types.ts';

export const ALPHA_COLLATION_VERSION = 'alpha-reconstructed-striped-v1';
const evidence = 'https://www.lethe.xyz/mtg/collation/lea.html';
export const alphaSheets: Readonly<Record<string, MagicSheet>> = Object.freeze(Object.fromEntries(
  Object.entries(data).map(([id, cells]) => [id, Object.freeze({ id, columns: 11,
    cells: Object.freeze(cells.map(cell => Object.freeze(cell))), evidence,
    confidence: id === 'common' ? 'reconstructed' : 'estimated',
    note: id === 'common' ? 'Published Alpha common reconstruction: 74 spells and 47 land positions.'
      : id === 'rare' ? 'Published tentative Alpha rare reconstruction: 116 rares and 5 Islands. Full sheet has not been directly observed.'
      : 'Beta uncommon layout used as an explicitly uncertain Alpha estimate: 95 uncommons and 26 lands. Alpha land art positions are unresolved; the two Alpha arts are sampled equally within each land cell, a presentation estimate rather than a historical art-frequency claim.',
  })])));
export const alphaCollationNote = '11 common-sheet + 3 uncommon-sheet + 1 rare-sheet cards; lands may occupy any slot. Reconstructed sheets; uncommon/rare positions are estimates. Stripe widths 2–5 are sampled equally as a simulation choice; no box sequence or historical pull-rate guarantee.';
