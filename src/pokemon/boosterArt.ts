import type { PokemonBooster } from './types.ts';

const featuredSets = new Set(['sv01', 'sv02', 'sv03', 'sv03.5', 'sv04', 'sv05', 'sv06', 'sv07', 'sv08', 'sv09', 'sv10']);

/** TCGdex currently omits English booster metadata for these products. These
 * local product shots keep selection and the physical wrapper deterministic. */
export function localBoosterArt(setId: string): PokemonBooster[] | undefined {
  if (!featuredSets.has(setId)) return undefined;
  const artwork = `${import.meta.env?.BASE_URL ?? '/'}packs/pokemon/${setId}.webp`;
  return [{ id: 'featured', name: 'Featured booster', front: artwork }];
}
