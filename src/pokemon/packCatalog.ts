import type { CatalogEntry } from './types.ts';

// Product identity is independent of whether Holo has implemented its opening.
const nonPackSets = new Set([
  'bwbsp', 'bwalt', 'bw11r', 'basep', 'np', 'dpp', 'hsp', 'bwp', 'xy0', 'xybsp', 'xyalt', 'xy9-5r',
  'smbsp', 'smalt', 'sm-energy',
  'swshbsp', 'swshalt', 'swsh7-5r', 'swsh9a', 'swsh10a', 'swsh11a', 'swsh12a', 'swsh12-5a',
  'mep', 'svp', 'svalt', 'sve', 'mee', 'mfb', 'si1', 'sp',
  '30th-c', '30th-classic', '30th-rgb',
]);

export function isPokemonPackSet(set: Pick<CatalogEntry, 'id' | 'name'>): boolean {
  return !nonPackSets.has(set.id) && !/\b(promos?|promotional|energies|energy|decks?|starter set|my first battle|sample set|southern islands|trainer gallery|galarian gallery|alternate (?:and special )?printings|special printings)\b/i.test(set.name);
}
